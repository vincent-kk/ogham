import { REVIEW_STATE_DIAGNOSTIC_CODES } from '../../../../../constants/reviewState.js';
import { ToolDiagnosticError } from '../../../../errors/toolDiagnosticError.js';
import type {
  ReviewStatePaths,
  ReviewStateRecord,
} from '../../state/reviewStateTypes.js';

import { observeReviewGroupInputs } from './observeReviewGroupInputs.js';
import { readReviewEnvironmentHash } from './readReviewEnvironmentHash.js';

/** Actions that call this freshness check; each gets a distinct next action. */
type InputsFreshCallingAction = 'checkpoint' | 'validate' | 'seal';

/** Next action for `review-inputs-stale`, keyed by the calling action. */
const INPUTS_STALE_NEXT_ACTIONS: Record<InputsFreshCallingAction, string> = {
  validate:
    'Do not validate this generation. After every in-flight actor finishes, call prepare again with the same arguments and without force; it starts a new generation that reuses validated opinions whose inputs did not change.',
  seal: 'Do not publish a verdict: report this and stop. A new /filid:cross-review run prepares a generation for the changed instructions or rules and reuses unaffected opinions.',
  checkpoint:
    'Stop and tell the user that local review inputs (instructions, review rules or actor methods) changed since the review. Only reverting those edits clears this; if they must stay, the review must be prepared again by /filid:cross-review outside resolve or revalidate.',
};

/**
 * Reject local input drift before accepting an actor result or reusing a seal.
 * @param state Active state containing the immutable preparation recipe.
 * @param paths Active generation's materialized diff paths.
 * @param action Calling action, which selects the stale-input next action.
 * @param groupId Optional target group for actor-specific validation.
 * @returns Nothing when observed inputs still match preparation and recorded reads.
 * @throws A stable stale-input diagnostic requiring prepare, never implicit force.
 */
export async function assertReviewInputsFresh(
  state: ReviewStateRecord,
  paths: ReviewStatePaths,
  action: InputsFreshCallingAction,
  groupId?: string,
): Promise<void> {
  const recipe = state.incremental;
  if (!recipe) return;
  const nextAction = INPUTS_STALE_NEXT_ACTIONS[action];
  if (
    readReviewEnvironmentHash(state, recipe.pluginRoot) !==
    recipe.environmentHash
  )
    throw new ToolDiagnosticError(
      REVIEW_STATE_DIAGNOSTIC_CODES.INPUTS_STALE,
      'Local review inputs changed after preparation: repository instructions, review rules, actor methods, or the generatedPaths/lockfiles config differ from the prepared review.',
      nextAction,
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
  const changedGroup = observed.find(
    (group) =>
      JSON.stringify(group.fileInputs) !==
      JSON.stringify(
        state.groups.find((entry) => entry.id === group.id)?.fileInputs,
      ),
  );
  if (changedGroup)
    throw new ToolDiagnosticError(
      REVIEW_STATE_DIAGNOSTIC_CODES.INPUTS_STALE,
      `Observed inputs of group ${changedGroup.id} changed after preparation.`,
      nextAction,
    );
}
