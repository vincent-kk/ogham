import type { ReviewStateRecord } from '../../../../../mcp/tools/reviewState/state/reviewStateTypes.js';

import { buildReviewOpinion } from './buildReviewOpinion.js';
import { validateReviewStateSealGroup } from './validateReviewStateSealGroup.js';

/** Inputs that adapt an existing test repository to the v7 validation fixture. */
interface PreparedReviewStateValidationInput {
  /** Temporary repository containing the prepared review state. */
  projectRoot: string;
  /** Temporary plugin root containing the built-in review rule map. */
  pluginRoot: string;
  /** Branch identity used by prepare and seal. */
  branchName: string;
  /** Host plugin-root value restored by the calling test. */
  originalPluginRoot: string | undefined;
  /** Prepared state whose first group receives trusted empty opinions. */
  state: ReviewStateRecord;
}

/**
 * Validate trusted empty reviewer and verifier artifacts for a prepared state.
 *
 * @param input Repository identity and prepared v7 state.
 * @returns State persisted by verifier validation.
 */
export async function validatePreparedReviewState(
  input: PreparedReviewStateValidationInput,
): Promise<ReviewStateRecord> {
  const group = input.state.groups[0];
  if (!group) throw new Error('prepared fixture did not create a review group');
  return validateReviewStateSealGroup({
    fixture: {
      projectRoot: input.projectRoot,
      pluginRoot: input.pluginRoot,
      branchName: input.branchName,
      originalPluginRoot: input.originalPluginRoot,
    },
    state: input.state,
    opinion: buildReviewOpinion(input.state, group),
    decisions: [],
  });
}
