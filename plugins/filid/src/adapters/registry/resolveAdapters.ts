import { pathForCompare, portableResolve } from '@ogham/cross-platform/paths';

import type {
  AdapterClaim,
  AdapterDiagnostic,
  AdapterOwnership,
  AdapterResolution,
  StructureAdapter,
} from '../../types/adapters.js';

interface ClaimedAdapter {
  adapter: StructureAdapter;
  claim: AdapterClaim;
  files: Map<string, string>;
}

export async function resolveAdapters(
  projectRoot: string,
  adapters: readonly StructureAdapter[],
  requestedPaths?: readonly string[],
): Promise<AdapterResolution> {
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
        left.adapter.id.localeCompare(right.adapter.id),
    );
  const claimed: ClaimedAdapter[] = await Promise.all(
    active.map(async ({ adapter, claim }) => {
      const files = new Map<string, string>();
      for (const path of await adapter.discoverSourceFiles(projectRoot)) {
        const absolutePath = portableResolve(projectRoot, path);
        const key = pathForCompare(absolutePath);
        if (!files.has(key)) files.set(key, absolutePath);
      }
      return { adapter, claim, files };
    }),
  );
  const requested = new Map<string, string>();
  for (const path of requestedPaths ??
    claimed.flatMap(({ files }) => [...files.values()])) {
    const absolutePath = portableResolve(projectRoot, path);
    const key = pathForCompare(absolutePath);
    if (!requested.has(key)) requested.set(key, absolutePath);
  }
  const paths = [...requested.values()].sort((left, right) =>
    pathForCompare(left).localeCompare(pathForCompare(right)),
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
        .sort((left, right) => left.localeCompare(right));
      diagnostics.push({
        code: 'ambiguous-adapter-claim',
        path,
        adapterIds,
        message: `Equal-confidence adapters claim ${path}: ${adapterIds.join(', ')}`,
      });
      continue;
    }

    const [{ adapter, claim }] = highest;
    ownership.set(path, { adapter, claim });
  }

  return {
    adapters: active.map(({ adapter }) => adapter),
    claims: new Map(active.map(({ adapter, claim }) => [adapter.id, claim])),
    ownership,
    unsupportedPaths,
    diagnostics,
  };
}
