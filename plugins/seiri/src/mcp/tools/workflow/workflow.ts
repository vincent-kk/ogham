import { loadIntervention } from '../../../core/infra/configLoader/index.js';
import { parseWorkflowRequest } from '../../../core/sessionSignals/index.js';
import type { WorkflowReply, WorkflowRequest } from '../../../types/workflow.js';

/** Validate a model request; only paired native hooks can activate assistance. */
export function handleWorkflow(input: WorkflowRequest): WorkflowReply {
  const request = parseWorkflowRequest(input);
  if (!request)
    throw new Error(
      'workflow requires an absolute project_root, kebab-case task, valid action, and change/review intent for start or resume',
    );
  const effective = loadIntervention(request.project_root).effective;
  if (effective !== 'standard' && effective !== 'strict')
    return { status: 'disabled', reason: effective };
  return {
    status: 'accepted',
    action: request.action,
    task: request.task,
    ...(request.intent ? { intent: request.intent } : {}),
  };
}
