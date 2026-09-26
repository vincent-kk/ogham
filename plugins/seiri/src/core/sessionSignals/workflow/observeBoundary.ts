import type {
  WorkflowBinding,
  WorkflowIdentity,
} from '../../../types/workflow.js';

import { prepareDirectory } from './prepareDirectory.js';
import { advanceBoundary } from './utils/advanceBoundary.js';
import { withWorkflowState } from './withWorkflowState.js';

/** Options narrowing one boundary observation beyond identity, dial and time. */
export interface ObserveBoundaryOptions {
  /** Whether this is the first child of an existing generation; when true and the actor already has a generation, `enabled` is overridden to `false`. */
  firstChild?: boolean;
  /** Whether an existing binding is suspended by this boundary. */
  suspend?: boolean;
}

/**
 * Silently replace a trusted turn anchor; inactive dials only revoke existing metadata.
 * @param identity Host-normalized actor identity.
 * @param enabled Whether the intervention dial permits creating or refreshing metadata; forced to `false` for a first child generation.
 * @param now Epoch ms read once at the calling hook's outermost handler.
 * @param options `firstChild` and `suspend`, kept as one options object so a
 *   two-positional-boolean call cannot be reordered by mistake.
 * @returns The post-update binding snapshot from inside the same actor
 *   transaction, or `undefined` when there is no binding or the transaction
 *   did not run. Runs — and, on success, lifts a quarantine left by a prior
 *   failed transaction — even while the actor is quarantined, since this
 *   boundary's generation bump and invocations/seen reset discard anything
 *   recorded before that failure.
 */
export function observeBoundary(
  identity: WorkflowIdentity,
  enabled: boolean,
  now: number,
  options: ObserveBoundaryOptions = {},
): WorkflowBinding | undefined {
  const { firstChild = false, suspend = false } = options;
  return withWorkflowState(
    identity,
    enabled && !!identity.turn && prepareDirectory,
    now,
    (state) =>
      advanceBoundary(
        state,
        (firstChild && state.generation > 0 ? false : enabled)
          ? identity.turn
          : undefined,
        suspend,
      ),
    { revokeOnFailure: true, recover: { suspend } },
  );
}
