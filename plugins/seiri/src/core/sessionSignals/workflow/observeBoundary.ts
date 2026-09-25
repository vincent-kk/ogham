import type { WorkflowIdentity } from '../../../types/workflow.js';

import { withWorkflowState } from './withWorkflowState.js';

/** Silently replace a trusted turn anchor; inactive dials only revoke existing metadata. */
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
