import { INJECTION_PREFIX } from '../../../constants/plugin.js';
import type { WorkflowIntent, WorkflowStep } from '../../../types/workflow.js';

import { renderProgressBody } from './renderProgressBody.js';

/**
 * Acknowledges a `created` transition — a brand new binding, or a `start`
 * restarting the already-bound task from scratch.
 * @param task The newly created binding's task name.
 * @param intent The newly created binding's declared intent.
 * @param step Chain skill recorded on the binding, when one is.
 * @returns The created acknowledgment to inject.
 */
export function renderCreatedAck(
  task: string,
  intent: WorkflowIntent,
  step?: WorkflowStep,
): string {
  return `${INJECTION_PREFIX} Workflow ${task} started (${intent}): ${renderProgressBody(step)}`;
}
