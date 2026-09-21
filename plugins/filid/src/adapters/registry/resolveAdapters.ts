import { pathForCompare, portableResolve } from '@ogham/cross-platform';

import type {
  AdapterClaim,
  AdapterDiagnostic,
  AdapterOwnership,
  AdapterResolution,
  StructureAdapter,
} from '../../types/adapters.js';
import { compareByBytes } from '../../lib/compareByBytes.js';

const PATH_SEPARATOR = /[\\/]/;

interface ClaimedAdapter {
  adapter: StructureAdapter;
  claim: AdapterClaim;
  files: Map<string, string>;
  /** Links the adapter's discovery skipped, as it reported them. */
  links: string[];
}

/** Per-call narrowing of what ownership resolution judges. */
export interface ResolveAdaptersOptions {
  /** Paths to judge instead of the adapters' own discovery results. */
  requestedPaths?: readonly string[];
  /**
   * Directory names dropped before ownership is decided. A name matches only
   * below `projectRoot`, so a root that happens to sit inside a directory of
   * that name keeps its files.
   */
  excludedDirectoryNames?: readonly string[];
}

/**
 * Build a predicate that reports whether a path sits under an excluded
 * directory. Only the directory segments below the project root are inspected —
 * the filename is not a directory, and the root's own segments are not the
 * project's structure.
 * @param projectRoot Absolute root every candidate path is measured against.
 * @param excludedDirectoryNames Directory names to drop; empty disables the filter.
 * @param judgesLastSegment Whether the last segment counts as a directory
 *   name too: true for an unfollowed link, whose own name stands where a
 *   directory would.
 * @returns Predicate over absolute candidate paths.
 */
function createExclusionFilter(
  projectRoot: string,
  excludedDirectoryNames: readonly string[],
  judgesLastSegment = false,
): (absolutePath: string) => boolean {
  if (excludedDirectoryNames.length === 0) return () => false;
  const excluded = new Set(excludedDirectoryNames);
  const rootSegmentCount = projectRoot
    .split(PATH_SEPARATOR)
    .filter(Boolean).length;
  return (absolutePath) =>
    absolutePath
      .split(PATH_SEPARATOR)
      .filter(Boolean)
      .slice(rootSegmentCount, judgesLastSegment ? undefined : -1)
      .some((segment) => excluded.has(segment));
}

export async function resolveAdapters(
  projectRoot: string,
  adapters: readonly StructureAdapter[],
  options: ResolveAdaptersOptions = {},
): Promise<AdapterResolution> {
  const { requestedPaths, excludedDirectoryNames = [] } = options;
  const isExcluded = createExclusionFilter(projectRoot, excludedDirectoryNames);
  const isExcludedLink = createExclusionFilter(
    projectRoot,
    excludedDirectoryNames,
    true,
  );
  const detected = await Promise.all(
    adapters.map(async (adapter) => ({
      adapter,
      claim: await adapter.detect(projectRoot),
    })),
  );
  const active = detected
    .filter(({ claim }) => claim.confidence > 0)
    .sort(
      (left, right) =>
        right.claim.confidence - left.claim.confidence ||
        compareByBytes(left.adapter.id, right.adapter.id),
    );
  const claimed: ClaimedAdapter[] = await Promise.all(
    active.map(async ({ adapter, claim }) => {
      const files = new Map<string, string>();
      const tree = adapter.discoverSourceTree
        ? await adapter.discoverSourceTree(projectRoot)
        : {
            files: await adapter.discoverSourceFiles(projectRoot),
            unfollowedLinks: [],
          };
      for (const path of tree.files) {
        const absolutePath = portableResolve(projectRoot, path);
        if (isExcluded(absolutePath)) continue;
        const key = pathForCompare(absolutePath);
        if (!files.has(key)) files.set(key, absolutePath);
      }
      return { adapter, claim, files, links: tree.unfollowedLinks };
    }),
  );
  const requested = new Map<string, string>();
  for (const path of requestedPaths ??
    claimed.flatMap(({ files }) => [...files.values()])) {
    const absolutePath = portableResolve(projectRoot, path);
    if (isExcluded(absolutePath)) continue;
    const key = pathForCompare(absolutePath);
    if (!requested.has(key)) requested.set(key, absolutePath);
  }
  const paths = [...requested.values()].sort((left, right) =>
    compareByBytes(pathForCompare(left), pathForCompare(right)),
  );
  const ownership = new Map<string, AdapterOwnership>();
  const unsupportedPaths: string[] = [];
  const diagnostics: AdapterDiagnostic[] = [];

  for (const path of paths) {
    const key = pathForCompare(path);
    const candidates = claimed.filter(({ files }) => files.has(key));
    if (candidates.length === 0) {
      unsupportedPaths.push(path);
      diagnostics.push({
        code: 'unsupported',
        path,
        message: `No registered adapter owns ${path}`,
        nextAction:
          'Filid has no adapter for this file, so its imports and exports are not analyzed. If the file is source code the dependency graph needs, report the affected results as unsupported; otherwise nothing is needed.',
      });
      continue;
    }

    const highestConfidence = Math.max(
      ...candidates.map(({ claim }) => claim.confidence),
    );
    const highest = candidates.filter(
      ({ claim }) => claim.confidence === highestConfidence,
    );
    if (highest.length > 1) {
      const adapterIds = highest
        .map(({ adapter }) => adapter.id)
        .sort(compareByBytes);
      diagnostics.push({
        code: 'ambiguous-adapter-claim',
        path,
        adapterIds,
        message: `Equal-confidence adapters claim ${path}: ${adapterIds.join(', ')}`,
        nextAction:
          'Set adapters.mode to "explicit" and list exactly one of these adapters in adapters.enabled in .filid/config.json, then run again.',
      });
      continue;
    }

    const [{ adapter, claim }] = highest;
    ownership.set(path, { adapter, claim });
  }

  const unfollowedLinks = claimed
    .flatMap(({ links }) => links)
    .map((path) => portableResolve(projectRoot, path))
    .filter((path) => !isExcludedLink(path));

  return {
    adapters: active.map(({ adapter }) => adapter),
    claims: new Map(active.map(({ adapter, claim }) => [adapter.id, claim])),
    ownership,
    unsupportedPaths,
    unfollowedLinks: [
      ...new Map(
        unfollowedLinks.map((path) => [pathForCompare(path), path]),
      ).values(),
    ].sort((left, right) =>
      compareByBytes(pathForCompare(left), pathForCompare(right)),
    ),
    diagnostics,
  };
}
