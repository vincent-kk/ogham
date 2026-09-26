import type {
  WorkflowBinding,
  WorkflowIdentity,
} from '../../../types/workflow.js';

import { advanceBoundary } from './utils/advanceBoundary.js';
import { withWorkflowState } from './withWorkflowState.js';

/**
 * Suspend an existing binding without ever creating actor metadata —
 * equivalent to `observeBoundary(identity, false, now, { suspend: true })`,
 * without importing the create path.
 * @param identity Host-normalized actor identity.
 * @param now Epoch ms read once at the calling hook's outermost handler.
 * @returns The post-update binding snapshot from inside the same actor
 *   transaction, or `undefined` when there is no binding or the transaction
 *   did not run.
 */
export function suspendActor(
  identity: WorkflowIdentity,
  now: number,
): WorkflowBinding | undefined {
  return withWorkflowState(
    identity,
    false,
    now,
    (state) => advanceBoundary(state, undefined, true),
    true,
  );
}
