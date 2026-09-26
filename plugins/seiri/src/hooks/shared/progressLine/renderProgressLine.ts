import { INJECTION_PREFIX } from '../../../constants/plugin.js';
import type { WorkflowIntent, WorkflowStep } from '../../../types/workflow.js';

import { renderProgressBody } from './renderProgressBody.js';

/**
 * The per-turn line naming an active binding's task, intent, and chain position.
 * @param task Bound task name.
 * @param intent Bound task's declared intent.
 * @param step Chain skill recorded on the binding, when one is.
 * @returns The progress line to inject.
 */
export function renderProgressLine(
  task: string,
  intent: WorkflowIntent,
  step?: WorkflowStep,
): string {
  return `${INJECTION_PREFIX} ${task} (${intent}): ${renderProgressBody(step)}`;
}
