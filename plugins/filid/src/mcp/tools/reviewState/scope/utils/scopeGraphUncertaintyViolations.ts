import { BUILTIN_RULE_IDS } from '../../../../../constants/builtinRuleIds.js';
import type { UnknownFile } from '../../../../../types/fractal.js';
import type { ReviewScopeViolation } from '../../state/reviewStateTypes.js';

/** Rules that report `indeterminate` because the dependency graph has unknown files. */
const GRAPH_UNCERTAINTY_RULE_IDS: ReadonlySet<string> = new Set([
  BUILTIN_RULE_IDS.CIRCULAR_DEPENDENCY,
  BUILTIN_RULE_IDS.EXTERNAL_IMPORT_BOUNDARY,
  BUILTIN_RULE_IDS.PURE_FUNCTION_ISOLATION,
]);

/**
 * Judge the graph-uncertainty rule results by the review scope, not the project.
 *
 * Validate and scan report them for the whole project. A review claims only
 * its scope, so with no unknown file in that scope the result is dropped, and
 * otherwise its message names the in-scope unknown files. Every other
 * violation, an `unsupported` graph's included, is kept unchanged.
 * @param violations Structure violations of the review snapshot.
 * @param inScopeUnknownFiles Unknown files inside the review scope.
 * @returns The violations to select candidates from.
 */
export function scopeGraphUncertaintyViolations(
  violations: readonly ReviewScopeViolation[],
  inScopeUnknownFiles: readonly UnknownFile[],
): ReviewScopeViolation[] {
  const named = inScopeUnknownFiles
    .map(({ path }) => path)
    .sort()
    .join(', ');
  return violations.flatMap((violation) => {
    if (
      violation.certainty !== 'indeterminate' ||
      !GRAPH_UNCERTAINTY_RULE_IDS.has(violation.ruleId)
    )
      return [violation];
    return named === ''
      ? []
      : [
          {
            ...violation,
            message: `${violation.message} Unknown files in the review scope: ${named}.`,
          },
        ];
  });
}
