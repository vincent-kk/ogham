import { handleReviewState } from '../../../../../mcp/tools/reviewState/index.js';
import type {
  ReviewStateInput,
  ReviewStateResultFor,
} from '../../../../../mcp/tools/reviewState/state/reviewStateTypes.js';
import { seedFacts } from '../../../../integration/helpers/seedFacts.js';

/**
 * Bootstrap the project's facts, then prepare — the order the skill uses.
 *
 * Prepare refuses a review scope whose facts are not settled (spec §9), so a
 * fixture that commits a change and prepares has to submit the facts of what
 * it committed first, exactly as the cross-review skill does. Putting that in
 * one helper keeps every fixture's prepare call honest about the step rather
 * than scattering a seed line before each one.
 *
 * @param input - Prepare input, whose `projectRoot` names the project to seed.
 * @returns What `handleReviewState` returns for that prepare.
 * @throws Whatever prepare throws, the facts gate included.
 */
export async function prepareWithFacts<Input extends ReviewStateInput>(
  input: Input,
): Promise<ReviewStateResultFor<Input>> {
  await seedFacts(input.projectRoot);
  return handleReviewState(input);
}
