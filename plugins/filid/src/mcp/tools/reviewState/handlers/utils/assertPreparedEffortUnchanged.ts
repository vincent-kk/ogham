import { REVIEW_STATE_DIAGNOSTIC_CODES } from '../../../../../constants/reviewState.js';
import { ToolDiagnosticError } from '../../../../errors/toolDiagnosticError.js';
import type {
  ReviewEffort,
  ReviewStateRecord,
} from '../../state/reviewStateTypes.js';

/**
 * Keep potentially in-flight assignments bound to their prepared effort.
 * @param state Same-identity prepared state selected for reuse.
 * @param effort Effective effort resolved from the current request and config.
 * @throws Before any artifact mutation when the requested policy differs.
 */
export function assertPreparedEffortUnchanged(
  state: ReviewStateRecord,
  effort: ReviewEffort,
): void {
  if (state.effort !== effort)
    throw new ToolDiagnosticError(
      REVIEW_STATE_DIAGNOSTIC_CODES.EFFORT_LOCKED,
      `Prepared review effort is ${state.effort}; this request resolves to ${effort} (from the effort argument or review.effort config).`,
      `Stop without dispatching actors. Ask the user whether to resume with effort "${state.effort}" (call prepare with that effort) or start a fresh review with force: true after all prior actors finish, which repeats all review work.`,
    );
}
