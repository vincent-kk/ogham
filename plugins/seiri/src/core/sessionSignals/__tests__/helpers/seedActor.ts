import type { WorkflowIdentity } from '../../../../types/workflow.js';
import { prepareDirectory } from '../../workflow/prepareDirectory.js';
import { advanceBoundary } from '../../workflow/utils/advanceBoundary.js';
import { withWorkflowState } from '../../workflow/withWorkflowState.js';

/**
 * Prepare an unbound actor with generation one and its trusted turn anchor.
 * @param identity Actor identity and turn to seed in an isolated repository.
 * @param now Epoch milliseconds used for the initial observation.
 */
export function seedActor(identity: WorkflowIdentity, now: number): void {
  withWorkflowState(identity, prepareDirectory, now, (state) => {
    advanceBoundary(state, identity.turn, false);
  });
}
