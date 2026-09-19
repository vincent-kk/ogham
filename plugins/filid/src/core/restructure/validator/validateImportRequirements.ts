import { RESTRUCTURE_VALIDATION_CODES } from '../../../constants/restructure.js';
import type { ProjectSnapshot } from '../../../types/fractal.js';
import type {
  ImportRequirement,
  MoveInstruction,
  PlanValidationFinding,
} from '../../../types/restructure.js';

import type { RequiredLoads } from './collectRequiredLoads.js';
import { type ImportMiss, findImportMiss } from './findImportMiss.js';

/**
 * The branch every failed import finding ends with, for a reference the analysis may have misread.
 * @param entry - Import requirement
 * @returns Next-action sentence for a consumer that holds no such import
 */
function misreadBranch(entry: ImportRequirement): string {
  return ` If ${entry.consumerPath} holds no such import — the reported reference sits in a comment or a string — the dependency analysis is wrong: do not edit the file; report ${entry.consumerPath} and "${entry.currentSpecifier}" to the user.`;
}

/**
 * The fact that breaks an import requirement, most specific first.
 * @param entry - Import requirement
 * @param miss - What `findImportMiss` found
 * @param unresolvedPrefix - Wording before the unresolved specifier
 * @returns Finding message naming the consumer and the file it must load
 */
function missMessage(
  entry: ImportRequirement,
  miss: ImportMiss,
  unresolvedPrefix: string,
): string {
  if (miss.unresolved)
    return `${entry.consumerPath} ${unresolvedPrefix} "${entry.currentSpecifier}".`;
  if (miss.elsewhere)
    return `The import "${entry.currentSpecifier}" in ${entry.consumerPath} loads ${miss.elsewhere.resolvedPath} instead of ${entry.requiredResolvedPath} after the moves.`;
  return `No import in ${entry.consumerPath} loads ${entry.requiredResolvedPath}.`;
}

/**
 * Check where the plan's import requirements resolve after execution, by resolution alone.
 *
 * `affectedImports` and `preservedImports` share one predicate
 * (`findImportMiss`): some reference of the consumer loads the required file,
 * every reference still spelled `currentSpecifier` loads a file the plan
 * requires of that consumer, and that specifier is not reported unresolved. The specifier the caller wrote does not
 * matter. Verification files are exempt from graph certainty, so the
 * diagnostic is the only trace of their broken imports.
 * @param snapshot - Post-execution snapshot
 * @param move - The move with its requirements at final paths
 * @param requiredLoads - Files the whole plan requires of each consumer
 * @returns An `import-rewrite-missing` or `preserved-import-broken` finding per
 * import that does not resolve as required
 */
export function validateImportRequirements(
  snapshot: ProjectSnapshot,
  move: MoveInstruction,
  requiredLoads: RequiredLoads,
): PlanValidationFinding[] {
  const required = move.affectedImports.flatMap<PlanValidationFinding>(
    (entry) => {
      const miss = findImportMiss(snapshot, entry, requiredLoads);
      if (!miss) return [];
      const spelled = entry.suggestedSpecifier
        ? `, for example "${entry.suggestedSpecifier}"`
        : ", with a relative path-like specifier in the file's existing style";
      return [
        {
          code: RESTRUCTURE_VALIDATION_CODES.IMPORT_REWRITE_MISSING,
          message: missMessage(entry, miss, 'still holds the unresolved import'),
          nextAction: `In ${entry.consumerPath}, change the import "${entry.currentSpecifier}" so it loads ${entry.requiredResolvedPath}${spelled}, then run postcondition again.${misreadBranch(entry)}`,
          path: entry.consumerPath,
          sourcePath: move.sourcePath,
        },
      ];
    },
  );
  const preserved = move.preservedImports.flatMap<PlanValidationFinding>(
    (entry) => {
      const miss = findImportMiss(snapshot, entry, requiredLoads);
      if (!miss) return [];
      return [
        {
          code: RESTRUCTURE_VALIDATION_CODES.PRESERVED_IMPORT_BROKEN,
          message: missMessage(entry, miss, 'holds the unresolved import'),
          nextAction: `In ${entry.consumerPath}, keep the import "${entry.currentSpecifier}" loading ${entry.requiredResolvedPath} — name the index file explicitly if a same-named file shadows the directory — then run postcondition again.${misreadBranch(entry)}`,
          path: entry.consumerPath,
          sourcePath: move.sourcePath,
        },
      ];
    },
  );
  return [...required, ...preserved];
}
