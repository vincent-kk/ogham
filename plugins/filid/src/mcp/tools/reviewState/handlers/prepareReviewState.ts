import {
  REVIEW_STATE_DIAGNOSTIC_CODES,
  REVIEW_STATE_DIAGNOSTIC_NEXT_ACTIONS,
} from '../../../../constants/reviewState.js';
import { ToolDiagnosticError } from '../../../errors/toolDiagnosticError.js';
import { readReviewState } from '../state/readReviewState.js';
import { resolveReviewStatePaths } from '../state/resolveReviewStatePaths.js';
import type {
  ResolvedReviewStateInput,
  ReviewPreparePayload,
} from '../state/reviewStateTypes.js';

import { prepareIncrementalReviewState } from './prepareIncrementalReviewState.js';

/**
 * Prepare committed file review through the ordinary host-independent API.
 * @param input Resolved prepare request with optional user review criteria.
 * @returns Prepared generation and executable handoffs.
 * @throws When legacy state requires an explicit bootstrap.
 */
export async function prepareReviewState(
  input: Extract<ResolvedReviewStateInput, { action: 'prepare' }>,
): Promise<ReviewPreparePayload> {
  const paths = resolveReviewStatePaths(input.projectRoot, input.branchName);
  const restored = readReviewState(paths.statePath);
  const previous = restored && !('kind' in restored) ? restored : null;
  if (
    restored &&
    (!previous?.incremental ||
      previous.groups.some((group) => !group.fileInputs)) &&
    !input.force
  )
    throw new ToolDiagnosticError(
      REVIEW_STATE_DIAGNOSTIC_CODES.INCREMENTAL_BOOTSTRAP_REQUIRED,
      `The review state at ${paths.statePath} predates incremental review or uses an unsupported schema, so it cannot be resumed.`,
      REVIEW_STATE_DIAGNOSTIC_NEXT_ACTIONS.INCREMENTAL_BOOTSTRAP_REQUIRED,
    );
  return prepareIncrementalReviewState(input, paths, previous);
}
