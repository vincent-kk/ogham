import { FACTS_UNKNOWN_CAUSES } from '../../../../../constants/facts.js';
import type { UnknownFile } from '../../../../../types/fractal.js';
import type { ReviewScopeViolation } from '../../state/reviewStateTypes.js';

/**
 * Turn a file no tool could read into a row the review has to answer for.
 *
 * `tool-error` passes the facts gate — re-extracting reproduces it, so waiting
 * would be a loop — but a file under review that no provider can read is the
 * review's business: the caller fixes the file or attests it (spec §4.6). The
 * rule name is the facts state and is deliberately not a roster rule: the rule
 * engine evaluates nothing here, the row reports a state.
 *
 * Only changed files reach the response; the caller's own filter drops the
 * rest, so this returns every one it is given.
 * @param inScopeUnknownFiles - Unknown files the review scope holds.
 * @returns One error-severity violation per file in `tool-error`.
 */
export function toolErrorViolations(
  inScopeUnknownFiles: readonly UnknownFile[],
): ReviewScopeViolation[] {
  return inScopeUnknownFiles
    .filter((file) => file.causes.includes(FACTS_UNKNOWN_CAUSES.TOOL_ERROR))
    .map((file) => ({
      source: 'structure' as const,
      severity: 'error' as const,
      path: file.path,
      ruleId: FACTS_UNKNOWN_CAUSES.TOOL_ERROR,
      message:
        'No provider could read this changed file, so filid holds no references for it: fix what makes it unreadable, or submit an attested record for it.',
      certainty: 'indeterminate' as const,
    }));
}
