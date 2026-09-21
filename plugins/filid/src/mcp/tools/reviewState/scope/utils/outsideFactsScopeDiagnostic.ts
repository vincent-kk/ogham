import {
  REVIEW_STATE_DIAGNOSTIC_CODES,
  REVIEW_STATE_DIAGNOSTIC_NEXT_ACTIONS,
} from '../../../../../constants/reviewState.js';
import type { ToolDiagnostic } from '../../../../../types/toolEnvelope.js';

/** Paths the message names before it counts the rest. */
const NAMED = 10;

/**
 * Report the review-scope files the declared facts scope left unread.
 *
 * Reference-based rules read facts, so a file the scope drops is judged by
 * every other rule and by none of those — and a review that does not say so
 * reads as if it had judged the file. The scope is the project's own
 * declaration, so this changes no verdict: `affects` is empty, which keeps it
 * out of the blocker fold and in the record.
 *
 * @param paths - Project-relative paths in the review scope that the declared
 * scope drops, in the order they should be reported.
 * @returns The diagnostic, or null when the scope left nothing unread — a line
 * on every review would be a line nobody reads.
 */
export function outsideFactsScopeDiagnostic(
  paths: readonly string[],
): ToolDiagnostic | null {
  if (paths.length === 0) return null;
  const named = paths.slice(0, NAMED).join(', ');
  const rest = paths.length - Math.min(paths.length, NAMED);
  return {
    code: REVIEW_STATE_DIAGNOSTIC_CODES.FILES_OUTSIDE_FACTS_SCOPE,
    message: `Reference-based rules did not judge ${paths.length} file(s) of this review: the declared facts scope does not cover ${named}${rest > 0 ? ` and ${rest} more` : ''}.`,
    affects: [],
    nextAction:
      REVIEW_STATE_DIAGNOSTIC_NEXT_ACTIONS.FILES_OUTSIDE_FACTS_SCOPE,
  };
}
