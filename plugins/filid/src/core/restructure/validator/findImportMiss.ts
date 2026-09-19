import { pathForCompare, samePath } from '@ogham/cross-platform';

import { UNRESOLVED_IMPORT_DIAGNOSTIC_CODE } from '../../../constants/restructure.js';
import type {
  DependencyEvidence,
  ProjectSnapshot,
} from '../../../types/fractal.js';
import type { ImportRequirement } from '../../../types/restructure.js';

import type { RequiredLoads } from './collectRequiredLoads.js';

/** Why an import requirement does not hold after execution. */
export interface ImportMiss {
  /** The consumer's `currentSpecifier` is still reported unresolved. */
  unresolved: boolean;
  /** A reference that keeps `currentSpecifier` but loads a file the plan never requires of its consumer. */
  elsewhere?: DependencyEvidence;
}

/**
 * Whether the post snapshot still reports the entry's old specifier as unresolved in its consumer.
 * @param snapshot - Post-execution snapshot
 * @param entry - Import requirement
 * @returns True when an `unresolved-local-dependency` names that consumer and specifier
 */
function staysUnresolved(
  snapshot: ProjectSnapshot,
  entry: ImportRequirement,
): boolean {
  return snapshot.diagnostics.some(
    (diagnostic) =>
      diagnostic.code === UNRESOLVED_IMPORT_DIAGNOSTIC_CODE &&
      diagnostic.path !== undefined &&
      samePath(diagnostic.path, entry.consumerPath) &&
      diagnostic.specifier === entry.currentSpecifier,
  );
}

/**
 * Judge one import requirement by resolution alone.
 *
 * It holds when some reference of the consumer loads `requiredResolvedPath`,
 * every reference still spelled `currentSpecifier` loads a file the plan
 * requires of that consumer — this one or another requirement's, since another
 * rewrite may legitimately produce the same string; none left is fine — and
 * that specifier is not reported unresolved. The specifier the caller wrote
 * does not matter. Resolution alone cannot tell a leftover reference from a
 * rewrite when both load a file the consumer requires, so that case passes.
 * @param snapshot - Post-execution snapshot
 * @param entry - Required or preserved import requirement at final paths
 * @param requiredLoads - Files the whole plan requires of each consumer
 * @returns Null when the requirement holds, otherwise what breaks it
 */
export function findImportMiss(
  snapshot: ProjectSnapshot,
  entry: ImportRequirement,
  requiredLoads: RequiredLoads,
): ImportMiss | null {
  const references = snapshot.dependencyGraph.edges
    .flatMap((edge) => edge.evidence)
    .filter((item) => samePath(item.sourceFile, entry.consumerPath));
  const loadsRequired = (item: DependencyEvidence) =>
    samePath(item.resolvedPath, entry.requiredResolvedPath);
  const allowed = requiredLoads.get(pathForCompare(entry.consumerPath));
  const elsewhere = references.find(
    (item) =>
      item.rawSpecifier === entry.currentSpecifier &&
      !loadsRequired(item) &&
      !allowed?.has(pathForCompare(item.resolvedPath)),
  );
  const unresolved = staysUnresolved(snapshot, entry);
  if (references.some(loadsRequired) && !elsewhere && !unresolved) return null;
  return { unresolved, elsewhere };
}
