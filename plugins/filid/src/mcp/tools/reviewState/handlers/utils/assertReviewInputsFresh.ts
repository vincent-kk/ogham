import { ToolDiagnosticError } from '../../../../errors/toolDiagnosticError.js';
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
  if (
    readReviewEnvironmentHash(state, recipe.pluginRoot) !==
    recipe.environmentHash
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
    recipe.userInstructions,
    recipe.changeContext ?? undefined,
    recipe.pluginRoot,
  );
  if (
    observed.some(
      (group) =>
        JSON.stringify(group.fileInputs) !==
        JSON.stringify(
          state.groups.find((entry) => entry.id === group.id)?.fileInputs,
        ),
    )
  )
    throw new ToolDiagnosticError(
      'review-inputs-stale',
      'Observed group inputs changed. Run prepare to refresh the generation.',
    );
}
