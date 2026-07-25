import { WORKFLOW_STATE_LINES } from '../../../constants/signals.js';
import type { WorkflowSignal } from '../../../types/signals.js';

/**
 * Narrow a stored value to a workflow signal.
 *
 * The state file is external data by the time it is read back — an older
 * build, another session, a hand edit — so the skill has to be a name that
 * still exists in the chain. Hand-written rather than schema-driven: this
 * runs inside a hook bundle, where a validation runtime is not welcome.
 */
export function isWorkflowSignal(value: unknown): value is WorkflowSignal {
  if (typeof value !== 'object' || value === null) return false;

  const { skill, announced } = value as Partial<WorkflowSignal>;
  return (
    typeof skill === 'string' &&
    Object.hasOwn(WORKFLOW_STATE_LINES, skill) &&
    typeof announced === 'boolean'
  );
}
