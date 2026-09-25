import { loadIntervention } from '../../../core/infra/configLoader/index.js';
import { parseWorkflowRequest } from '../../../core/sessionSignals/index.js';
import type { WorkflowRequest } from '../../../types/workflow.js';

/** Validate a model request; only paired native hooks can activate assistance. */
export function handleWorkflow(input: WorkflowRequest) {
  const request = parseWorkflowRequest(input);
  if (!request)
    throw new Error(
      'workflow requires an absolute project_root, kebab-case task, valid action, and change/review intent for start or resume',
    );
  const enabled = ['standard', 'strict'].includes(
    loadIntervention(request.project_root).effective,
  );
  return {
    status: enabled ? ('accepted' as const) : ('disabled' as const),
    action: request.action,
    task: request.task,
    ...(request.intent ? { intent: request.intent } : {}),
  };
}
