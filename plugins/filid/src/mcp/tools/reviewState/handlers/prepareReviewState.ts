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
      'review-incremental-bootstrap-required',
      'Use explicit force to preserve the legacy run and bootstrap observed inputs.',
    );
  return prepareIncrementalReviewState(input, paths, previous);
}
