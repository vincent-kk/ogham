import { samePath } from '@ogham/cross-platform';

import {
  RESTRUCTURE_VALIDATION_CODES,
  UNRESOLVED_IMPORT_DIAGNOSTIC_CODE,
} from '../../../constants/restructure.js';
import type { ProjectSnapshot } from '../../../types/fractal.js';
import type {
  DelegatedImport,
  MoveInstruction,
  PlanValidationFinding,
} from '../../../types/restructure.js';

/** Whether the post snapshot still reports the entry's old specifier as unresolved in its consumer. */
function staysUnresolved(
  snapshot: ProjectSnapshot,
  entry: DelegatedImport,
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
 * Check where the imports filid could not rewrite resolve after execution.
 *
 * A delegated import passes when some import of its consumer loads the
 * required file, whatever specifier the caller wrote, and its old specifier is
 * no longer reported unresolved. A preserved import that still holds its
 * specifier passes only when every piece of evidence for that specifier loads
 * the required file; once the caller has rewritten it, it is judged like a
 * delegated import. Neither may still be reported unresolved. Verification files are exempt
 * from graph certainty, so the diagnostic is the only trace of their broken
 * imports.
 * @param snapshot - Post-execution snapshot
 * @param move - The move with its delegated and preserved imports at final paths
 * @returns A `delegated-import-missing` or `preserved-import-broken` finding per
 * import that does not resolve as planned
 */
export function validateDelegatedImports(
  snapshot: ProjectSnapshot,
  move: MoveInstruction,
): PlanValidationFinding[] {
  const evidence = snapshot.dependencyGraph.edges.flatMap(
    (edge) => edge.evidence,
  );
  const delegated = move.delegatedImports.flatMap<PlanValidationFinding>(
    (entry) => {
      const unresolved = staysUnresolved(snapshot, entry);
      const loads = evidence.some(
        (item) =>
          samePath(item.sourceFile, entry.consumerPath) &&
          samePath(item.resolvedPath, entry.requiredResolvedPath),
      );
      if (loads && !unresolved) return [];
      return [
        {
          code: RESTRUCTURE_VALIDATION_CODES.DELEGATED_IMPORT_MISSING,
          message: unresolved
            ? `${entry.consumerPath} still holds the unresolved import "${entry.currentSpecifier}".`
            : `No import in ${entry.consumerPath} loads ${entry.requiredResolvedPath}.`,
          nextAction: `Filid could not write this specifier: in ${entry.consumerPath}, change the import "${entry.currentSpecifier}" so it loads ${entry.requiredResolvedPath}, using a relative path-like specifier in the file's existing style, then run postcondition again.`,
          path: entry.consumerPath,
          sourcePath: move.sourcePath,
        },
      ];
    },
  );
  const preserved = move.preservedImports.flatMap<PlanValidationFinding>(
    (entry) => {
      const unresolved = staysUnresolved(snapshot, entry);
      const consumer = evidence.filter((item) =>
        samePath(item.sourceFile, entry.consumerPath),
      );
      const own = consumer.filter(
        (item) => item.rawSpecifier === entry.currentSpecifier,
      );
      const loadsRequired = (item: (typeof evidence)[number]) =>
        samePath(item.resolvedPath, entry.requiredResolvedPath);
      const loads =
        own.length > 0
          ? own.every(loadsRequired)
          : consumer.some(loadsRequired);
      if (loads && !unresolved) return [];
      return [
        {
          code: RESTRUCTURE_VALIDATION_CODES.PRESERVED_IMPORT_BROKEN,
          message: unresolved
            ? `${entry.consumerPath} holds the unresolved import "${entry.currentSpecifier}".`
            : own.length > 0
              ? `The import "${entry.currentSpecifier}" in ${entry.consumerPath} no longer loads ${entry.requiredResolvedPath} after the moves; a file with the same name now takes precedence over the directory.`
              : `No import in ${entry.consumerPath} loads ${entry.requiredResolvedPath}.`,
          nextAction: `In ${entry.consumerPath}, rewrite the import "${entry.currentSpecifier}" so it loads ${entry.requiredResolvedPath} — name the index file explicitly if a same-named file shadows the directory — then run postcondition again.`,
          path: entry.consumerPath,
          sourcePath: move.sourcePath,
        },
      ];
    },
  );
  return [...delegated, ...preserved];
}
