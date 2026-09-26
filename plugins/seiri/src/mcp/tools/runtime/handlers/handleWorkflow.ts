import { loadIntervention } from '../../../../core/infra/configLoader/index.js';
import { parseWorkflowRequest } from '../../../../core/sessionSignals/index.js';
import type { WorkflowReply } from '../../../../types/workflow.js';

/**
 * Validate a model request; only paired native hooks can activate assistance.
 * @param input Raw MCP tool call arguments, parsed as a {@link WorkflowRequest}.
 * @returns `{ status: 'disabled' }` when the effective intervention dial is `off` or `advisory`; otherwise `{ status: 'accepted' }` echoing the requested action, task, step and intent — `intent` derived by {@link parseWorkflowRequest} when a `step` request omitted it.
 * @throws When `input` does not parse as a valid request — missing an absolute `project_root`, a kebab-case `task`, a valid `action`, a `WorkflowStep` for `step`, or `intent` on a `start`/`resume` request.
 */
export function handleWorkflow(input: unknown): WorkflowReply {
  const request = parseWorkflowRequest(input);
  if (!request)
    throw new Error(
      'runtime requires an absolute project_root, kebab-case task, valid action, a WorkflowStep for step, and change/review intent for start or resume',
    );
  const effective = loadIntervention(request.project_root).effective;
  if (effective !== 'standard' && effective !== 'strict')
    return { status: 'disabled', reason: effective };
  return {
    status: 'accepted',
    action: request.action,
    task: request.task,
    ...(request.step ? { step: request.step } : {}),
    ...(request.intent ? { intent: request.intent } : {}),
  };
}
