import type {
  WorkflowBinding,
  WorkflowIntent,
  WorkflowRequest,
} from '../../../../types/workflow.js';

/**
 * Build a fresh binding for a `created` or `switched` transition, or for a
 * same-task `start` — which restarts a task from scratch rather than
 * updating it in place.
 * @param request Request supplying the task name and, for `step`, the chain skill to record.
 * @param intent Intent to record; the caller has already resolved it (explicit or derived).
 * @returns A new binding with empty counts, announcements and verdicts.
 */
export function freshBinding(
  request: WorkflowRequest,
  intent: WorkflowIntent,
): WorkflowBinding {
  return {
    task: request.task,
    intent,
    state: 'active',
    ...(request.step ? { step: request.step } : {}),
    counts: {},
    announced: [],
    verdicts: {},
  };
}
