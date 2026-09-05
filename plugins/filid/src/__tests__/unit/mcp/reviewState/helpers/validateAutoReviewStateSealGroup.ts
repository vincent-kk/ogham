import { writeFileAtomicallySync } from '@ogham/cross-platform';

import { handleReviewState } from '../../../../../mcp/tools/reviewState/index.js';
import { resolveReviewArtifactPath } from '../../../../../mcp/tools/reviewState/state/resolveReviewArtifactPath.js';
import { resolveReviewStatePaths } from '../../../../../mcp/tools/reviewState/state/resolveReviewStatePaths.js';
import type { ReviewStateRecord } from '../../../../../mcp/tools/reviewState/state/reviewStateTypes.js';

import { buildReviewOpinion } from './buildReviewOpinion.js';
import type { ReviewStateSealFixture } from './createReviewStateSealFixture.js';
import { readPersistedReviewState } from './readPersistedReviewState.js';

/**
 * Validate an empty reviewer round and keep the server's auto-verify artifact.
 * @param fixture Isolated repository whose prepared identity supplies this round.
 * @param state Prepared state with a reviewable first group.
 * @returns Persisted review and auto-verify hash bindings without actor verification.
 * @throws When the fixture round does not pass the public validation action.
 */
export async function validateAutoReviewStateSealGroup(
  fixture: ReviewStateSealFixture,
  state: ReviewStateRecord,
): Promise<ReviewStateRecord> {
  const group = state.groups[0]!;
  const paths = resolveReviewStatePaths(state.projectRoot, state.branchName);
  writeFileAtomicallySync(
    resolveReviewArtifactPath(paths, group.skeletonPath),
    JSON.stringify(buildReviewOpinion(state, group)),
  );
  const result = await handleReviewState({
    action: 'validate',
    projectRoot: fixture.projectRoot,
    kind: 'review',
    group: group.id,
    round: 1,
  });
  if (!result.summary.ok) throw new Error('Fixture auto-verify review failed');
  return readPersistedReviewState(fixture.projectRoot, state.normalizedBranch);
}
