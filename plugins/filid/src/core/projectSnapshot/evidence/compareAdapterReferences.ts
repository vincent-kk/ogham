import { pathForCompare } from '@ogham/cross-platform';

import { DEPENDENCY_DIAGNOSTIC_CODES } from '../../../constants/dependencyDiagnosticCodes.js';
import { FACTS_ADAPTER_DIVERGENCE_NEXT_ACTION } from '../../../constants/facts.js';
import { toProjectRelativePath } from '../../../lib/toProjectRelativePath.js';
import type {
  AdapterResolution,
  DependencyReference,
} from '../../../types/adapters.js';
import type { SnapshotDiagnostic } from '../../../types/fractal.js';

/** How many differing references one message names before it stops. */
const SAMPLE_LIMIT = 3;

/**
 * Compare the store's references with the adapter's, file by file.
 *
 * The adapter is comparison material in this stage, never a fallback: nothing
 * here reaches the graph. Only `exact` files are compared, because they are
 * the ones the store makes a claim about — a file in any other state has no
 * stored answer to disagree with, and its absence is already reported as an
 * unknown file.
 *
 * Adapter references resolving outside the project root are dropped first, so
 * both sides are normalized the way a provider reports them (`external`,
 * spec §4.3); neither side can then differ merely by spelling.
 *
 * Deleted with the adapter in S4 together with everything that calls it.
 *
 * @param resolution - Adapter ownership of the project's source files.
 * @param projectRoot - Absolute project root the paths hang off.
 * @param references - What the store contributed, already absolute.
 * @param exactPaths - Project-relative paths the state model reported `exact`.
 * @returns One non-blocking diagnostic per file the two sources disagree about.
 */
export async function compareAdapterReferences(
  resolution: AdapterResolution,
  projectRoot: string,
  references: readonly DependencyReference[],
  exactPaths: ReadonlySet<string>,
): Promise<SnapshotDiagnostic[]> {
  const stored = new Map<string, Set<string>>();
  for (const reference of references) {
    const key = pathForCompare(reference.sourceFile);
    stored.set(key, (stored.get(key) ?? new Set()).add(keyOf(reference)));
  }
  const diagnostics: SnapshotDiagnostic[] = [];
  for (const [filePath, ownership] of resolution.ownership) {
    if (!exactPaths.has(toProjectRelativePath(projectRoot, filePath))) continue;
    const fromAdapter = new Set(
      (await ownership.adapter.extractDependencies(filePath))
        .filter((reference) => isInside(projectRoot, reference.resolvedPath))
        .map(keyOf),
    );
    const fromStore = stored.get(pathForCompare(filePath)) ?? new Set<string>();
    const onlyStored = [...fromStore].filter((key) => !fromAdapter.has(key));
    const onlyAdapter = [...fromAdapter].filter((key) => !fromStore.has(key));
    if (onlyStored.length + onlyAdapter.length === 0) continue;
    diagnostics.push({
      code: DEPENDENCY_DIAGNOSTIC_CODES.ADAPTER_DIVERGENCE,
      message: `The stored facts and the ${ownership.adapter.id} adapter describe ${filePath} differently: ${onlyStored.length} reference(s) only in the store, ${onlyAdapter.length} only in the adapter (${[...onlyStored, ...onlyAdapter].slice(0, SAMPLE_LIMIT).join('; ')}).`,
      path: filePath,
      affects: [],
      nextAction: FACTS_ADAPTER_DIVERGENCE_NEXT_ACTION,
    });
  }
  return diagnostics;
}

/**
 * The comparable identity of one reference: what it says and where it lands.
 * @param reference Reference from either source.
 * @returns A key ignoring the line numbers the server rewrites on acceptance.
 */
function keyOf(reference: DependencyReference): string {
  return [
    reference.kind,
    reference.sourceText ?? reference.rawSpecifier,
    reference.resolvedPath === null
      ? 'unresolved'
      : pathForCompare(reference.resolvedPath),
  ].join('\0');
}

/**
 * Whether a resolved target lies inside the project.
 * @param projectRoot Absolute project root.
 * @param resolvedPath Target the adapter resolved, or null.
 * @returns True for an unresolved target or one under the root.
 */
function isInside(projectRoot: string, resolvedPath: string | null): boolean {
  if (resolvedPath === null) return true;
  return pathForCompare(resolvedPath).startsWith(
    `${pathForCompare(projectRoot)}/`,
  );
}
