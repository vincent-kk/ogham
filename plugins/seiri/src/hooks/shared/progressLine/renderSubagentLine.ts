import { INJECTION_PREFIX } from '../../../constants/plugin.js';
import type { WorkflowIntent, WorkflowStep } from '../../../types/workflow.js';

import { renderProgressBody } from './renderProgressBody.js';

/**
 * Hands a subagent its parent's task once, on the child's first SubagentStart only.
 * @param task Parent main actor's bound task name.
 * @param intent Parent main actor's bound task intent.
 * @param step Chain skill recorded on the parent's binding, when one is.
 * @returns The subagent line to inject.
 */
export function renderSubagentLine(
  task: string,
  intent: WorkflowIntent,
  step?: WorkflowStep,
): string {
  return `${INJECTION_PREFIX} Parent task ${task} (${intent}): ${renderProgressBody(step)} — this subagent works inside the current step and starts no chain of its own.`;
}
