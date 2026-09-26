import { INJECTION_PREFIX } from '../../../constants/plugin.js';
import type { WorkflowRequest } from '../../../types/workflow.js';

/**
 * Text for a resume/pause/finish `updated` outcome; created/switched use
 * the progress-line shape instead.
 * @param request The applied lifecycle request.
 * @returns The control-verb acknowledgment to inject.
 */
export function controlVerbAck(request: WorkflowRequest): string {
  return `${INJECTION_PREFIX} Workflow ${request.task}: ${request.action} acknowledged (${request.intent ?? 'participation only'}).`;
}
