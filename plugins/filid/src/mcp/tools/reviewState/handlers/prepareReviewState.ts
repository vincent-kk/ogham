import { ToolDiagnosticError } from '../../../errors/toolDiagnosticError.js';
import { readReviewState } from '../state/readReviewState.js';
import { resolveReviewStatePaths } from '../state/resolveReviewStatePaths.js';
import { ReviewIncrementalSchemas } from '../state/reviewIncrementalSchemas.js';
import type {
  ResolvedReviewStateInput,
  ReviewPreparePayload,
} from '../state/reviewStateTypes.js';

import { prepareIncrementalReviewState } from './prepareIncrementalReviewState.js';
import { prepareReviewArtifacts } from './prepareReviewArtifacts.js';

/**
 * Select observed-input review while retaining explicit legacy API behavior.
 * @param input Resolved prepare request with optional host context.
 * @returns Prepared generation and executable handoffs.
 * @throws On malformed context, an implicit bootstrap or protocol downgrade.
 */
export async function prepareReviewState(
  input: Extract<ResolvedReviewStateInput, { action: 'prepare' }>,
): Promise<ReviewPreparePayload> {
  const paths = resolveReviewStatePaths(input.projectRoot, input.branchName);
  const restored = readReviewState(paths.statePath);
  const previous = restored && !('kind' in restored) ? restored : null;
  if (input.actorContext === undefined) {
    if (previous?.incremental)
      throw new ToolDiagnosticError(
        'review-context-required',
        'Supply actorContext to resume this incremental review.',
      );
    return prepareReviewArtifacts(input);
  }
  if (
    !ReviewIncrementalSchemas.actorContext.safeParse(input.actorContext).success
  )
    throw new Error('invalid review actorContext');
  if (restored && !previous?.incremental && !input.force)
    throw new ToolDiagnosticError(
      'review-incremental-bootstrap-required',
      'Use explicit force to preserve the legacy run and bootstrap observed inputs.',
    );
  return prepareIncrementalReviewState(input, paths, previous);
}
