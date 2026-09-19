import { ANALYSIS_AXES } from '../../../../../constants/analysisAxes.js';
import { REVIEW_CONTEXT_NEXT_ACTIONS } from '../../../../../constants/reviewState.js';
import type { ToolDiagnostic } from '../../../../../types/toolEnvelope.js';
import { affectsAnalysisAxis } from '../../../utils/affectsAnalysisAxis.js';
import { isFindingDiagnostic } from '../../../utils/isFindingDiagnostic.js';

const CONFIG_CODES: ReadonlySet<string> = new Set([
  'config-warning',
  'config-key-discarded',
]);

/**
 * Rewrite a shared snapshot diagnostic's next action to the review context.
 *
 * Following the diagnostic's original next action mid-review would change the
 * source or input hashes and make the review stale, so prepare substitutes a
 * review-safe instruction and keeps the original for reference. A config
 * diagnostic that affects an analysis axis blocks the verdict, so its sentence
 * says the review cannot be reported complete.
 *
 * @param diagnostic Shared snapshot diagnostic returned by prepare.
 * @returns The same diagnostic with `nextAction` prefixed by the review-context sentence.
 */
export function applyReviewContextNextAction(
  diagnostic: ToolDiagnostic,
): ToolDiagnostic {
  const contextSentence = isFindingDiagnostic(diagnostic)
    ? REVIEW_CONTEXT_NEXT_ACTIONS.DOCUMENT_FINDING
    : diagnostic.code === 'config-migration-required'
      ? REVIEW_CONTEXT_NEXT_ACTIONS.CONFIG_MIGRATION_REQUIRED
      : CONFIG_CODES.has(diagnostic.code)
        ? affectsAnalysisAxis(diagnostic, ANALYSIS_AXES)
          ? REVIEW_CONTEXT_NEXT_ACTIONS.CONFIG_WARNING_BLOCKING
          : REVIEW_CONTEXT_NEXT_ACTIONS.CONFIG_WARNING
        : REVIEW_CONTEXT_NEXT_ACTIONS.EVIDENCE;
  return {
    ...diagnostic,
    nextAction: `${contextSentence} Outside this review: ${diagnostic.nextAction}`,
  };
}
