import {
  REVIEW_SCOPE_DIRTY_PATH_LIMIT,
  REVIEW_STATE_GIT_ARGUMENTS,
} from '../../../../../constants/reviewState.js';
import { ToolDiagnosticError } from '../../../../errors/toolDiagnosticError.js';
import { parseGitStatusPaths } from '../../assess/parseGitStatusPaths.js';
import { computeReviewDirtyPathsHash } from '../../hash/computeReviewDirtyPathsHash.js';
import { executeReviewGit } from '../../hash/executeReviewGit.js';
import type {
  ReviewStatePaths,
  ReviewStateRecord,
} from '../../state/reviewStateTypes.js';

import { observeReviewGroupInputs } from './observeReviewGroupInputs.js';
import { readReviewEnvironmentHash } from './readReviewEnvironmentHash.js';

/**
 * Reject local input drift before accepting an actor result or reusing a seal.
 * @param state Active state containing the immutable preparation recipe.
 * @param paths Active generation's materialized diff paths.
 * @param groupId Optional target group for actor-specific validation.
 * @returns Nothing when observed inputs still match preparation and recorded reads.
 * @throws A stable stale-input diagnostic requiring prepare, never implicit force.
 */
export async function assertReviewInputsFresh(
  state: ReviewStateRecord,
  paths: ReviewStatePaths,
  groupId?: string,
): Promise<void> {
  const recipe = state.incremental;
  if (!recipe) return;
  const dirtyPaths = parseGitStatusPaths(
    await executeReviewGit(state.projectRoot, [
      ...REVIEW_STATE_GIT_ARGUMENTS.STATUS_PORCELAIN,
    ]),
  )
    .filter(
      (path) => path !== '.filid/review' && !path.startsWith('.filid/review/'),
    )
    .sort();
  const boundedDirtyPaths = dirtyPaths.slice(0, REVIEW_SCOPE_DIRTY_PATH_LIMIT);
  const recordedDirtyPathsHash =
    state.scope.dirtyPathsHash ??
    computeReviewDirtyPathsHash(state.scope.dirtyPaths);
  if (
    readReviewEnvironmentHash(state, recipe.pluginRoot) !==
      recipe.environmentHash ||
    computeReviewDirtyPathsHash(dirtyPaths) !== recordedDirtyPathsHash ||
    JSON.stringify(boundedDirtyPaths) !== JSON.stringify(state.scope.dirtyPaths)
  )
    throw new ToolDiagnosticError(
      'review-inputs-stale',
      'Local review inputs changed. Run prepare to refresh the generation.',
    );
  const selected = groupId
    ? { ...state, groups: state.groups.filter((group) => group.id === groupId) }
    : state;
  const observed = await observeReviewGroupInputs(
    selected,
    paths,
    recipe.actorContext,
    recipe.changeContext ?? undefined,
    recipe.pluginRoot,
  );
  if (
    observed.some(
      (group) =>
        group.input?.preparedInputHash !==
        state.groups.find((entry) => entry.id === group.id)?.input
          ?.preparedInputHash,
    )
  )
    throw new ToolDiagnosticError(
      'review-inputs-stale',
      'Observed group inputs changed. Run prepare to refresh the generation.',
    );
}
