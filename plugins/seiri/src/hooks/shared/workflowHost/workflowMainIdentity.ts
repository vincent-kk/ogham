import type { HookBaseInput } from '../../../types/hooks.js';
import type {
  WorkflowHostAdapter,
  WorkflowIdentity,
} from '../../../types/workflow.js';
import { WORKFLOW_ADAPTER } from '../workflowAdapter.js';

import { workflowIdentity } from './workflowIdentity.js';

/**
 * Resolve the `host + session_id + 'main'` actor a child's parent uses,
 * regardless of the calling payload's own `agent_id`.
 * @param input Hook payload; `cwd` and `session_id` must both be present or the call yields `undefined`.
 * @param adapter Host adapter fixed at build time; supplies the namespace and native turn reader.
 * @returns The main-actor identity {@link workflowIdentity} would resolve for the same payload with no `agent_id`, or `undefined` under the same conditions it returns `undefined`.
 */
export function workflowMainIdentity(
  input: HookBaseInput,
  adapter: WorkflowHostAdapter = WORKFLOW_ADAPTER,
): WorkflowIdentity | undefined {
  return workflowIdentity({ ...input, agent_id: undefined }, adapter);
}
