import { INJECTION_PREFIX } from '../../../constants/plugin.js';
import type { WorkflowIntent, WorkflowStep } from '../../../types/workflow.js';

import { renderProgressBody } from './renderProgressBody.js';

/**
 * Acknowledges a `switched` transition — an entry `step` or `start` that
 * replaced a different bound task.
 * @param task The newly bound task's name.
 * @param oldTask The task that was bound before this transition.
 * @param intent The newly bound task's declared intent.
 * @param step Chain skill recorded on the new binding, when one is.
 * @returns The switched acknowledgment to inject.
 */
export function renderSwitchedAck(
  task: string,
  oldTask: string,
  intent: WorkflowIntent,
  step?: WorkflowStep,
): string {
  return `${INJECTION_PREFIX} Workflow ${task} switched from ${oldTask} (${intent}): ${renderProgressBody(step)}`;
}
