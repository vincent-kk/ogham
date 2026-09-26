import { portableIsAbsolute } from '@ogham/cross-platform';

import { TASK_NAME_PATTERN } from '../../../constants/gates.js';
import { WORKFLOW_SKILLS } from '../../../constants/workflowChain.js';
import type { WorkflowRequest, WorkflowStep } from '../../../types/workflow.js';

/** Steps whose derived intent is `review`; every other step derives `change`. */
const REVIEW_STEPS: readonly WorkflowStep[] = [
  'review-plan',
  'request-review',
  'receive-review',
];

/**
 * Derive the intent a `step` request did not state.
 * @param step Chain skill named by the request.
 * @returns `'review'` for the three review-facing steps, `'change'` otherwise.
 */
function derivedStepIntent(step: WorkflowStep): 'change' | 'review' {
  return REVIEW_STEPS.includes(step) ? 'review' : 'change';
}

/**
 * Validate the shared lifecycle contract without guessing host identity.
 * @param value Raw MCP tool call arguments to validate.
 * @returns The validated request, or `undefined` when `action`,
 *   `project_root`, `task`, or an action-specific requirement fails:
 *   `start`/`resume` require `intent`; `step` requires a `step` naming a
 *   `WorkflowStep` and, when `intent` is omitted, derives it via
 *   {@link derivedStepIntent} — an explicit `intent` on a `step` request
 *   always wins over the derived one.
 */
export function parseWorkflowRequest(
  value: unknown,
): WorkflowRequest | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const request = value as WorkflowRequest;
  if (
    !['step', 'start', 'resume', 'pause', 'finish'].includes(request.action) ||
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
  if (request.action === 'step') {
    if (
      typeof request.step !== 'string' ||
      !(WORKFLOW_SKILLS as readonly string[]).includes(request.step)
    )
      return undefined;
    return {
      action: request.action,
      project_root: request.project_root,
      task: request.task,
      step: request.step,
      intent: request.intent ?? derivedStepIntent(request.step),
    };
  }
  return {
    action: request.action,
    project_root: request.project_root,
    task: request.task,
    ...(request.intent ? { intent: request.intent } : {}),
  };
}
