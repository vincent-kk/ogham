import { portableIsAbsolute } from '@ogham/cross-platform';

import { TASK_NAME_PATTERN } from '../../../constants/gates.js';
import type { WorkflowRequest } from '../../../types/workflow.js';

/** Validate the shared lifecycle contract without guessing host identity. */
export function parseWorkflowRequest(
  value: unknown,
): WorkflowRequest | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const request = value as WorkflowRequest;
  if (
    !['start', 'resume', 'pause', 'finish'].includes(request.action) ||
    typeof request.project_root !== 'string' ||
    !portableIsAbsolute(request.project_root) ||
    typeof request.task !== 'string' ||
    !TASK_NAME_PATTERN.test(request.task)
  )
    return undefined;
  if (
    (request.action === 'start' || request.action === 'resume') &&
    !['change', 'review'].includes(request.intent ?? '')
  )
    return undefined;
  if (
    request.intent !== undefined &&
    request.intent !== 'change' &&
    request.intent !== 'review'
  )
    return undefined;
  return {
    action: request.action,
    project_root: request.project_root,
    task: request.task,
    ...(request.intent ? { intent: request.intent } : {}),
  };
}
