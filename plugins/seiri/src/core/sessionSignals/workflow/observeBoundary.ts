import type { WorkflowIdentity } from '../../../types/workflow.js';

import { withWorkflowState } from './withWorkflowState.js';

/**
 * Silently replace a trusted turn anchor; inactive dials only revoke existing metadata.
 * @param identity Host-normalized actor identity.
 * @param enabled Whether the intervention dial permits creating or refreshing metadata; forced to `false` for a first child generation.
 * @param now Epoch ms read once at the calling hook's outermost handler.
 * @param firstChild Whether this observation is the first child of an existing generation; when true and the actor already has a generation, `enabled` is overridden to `false`.
 */
export function observeBoundary(
  identity: WorkflowIdentity,
  enabled: boolean,
  now: number,
  firstChild = false,
): void {
  withWorkflowState(
    identity,
    enabled && !!identity.turn,
    now,
    (state) => {
      if (firstChild && state.generation > 0) enabled = false;
      state.generation++;
      state.turn = enabled ? identity.turn : undefined;
      state.invocations = {};
      state.seen = [];
      if (state.binding) state.binding.state = 'suspended';
    },
    true,
  );
}
