import { STRICT_POSTURE_LINE } from '../../../../constants/postureLines.js';
import { WORKFLOW_CHAIN_LINE } from '../../../../constants/workflowChain.js';
import type { InterventionLevel } from '../../../../types/config.js';

/**
 * The posture lines for a dial position, consumed by the runtime MCP
 * tool's `dial` posture echo and by SessionStart's render: empty at `off`
 * and `advisory`, the workflow-chain line alone at `standard`, and the
 * workflow-chain line plus the strict posture line at `strict`.
 */
export function renderPostureLines(level: InterventionLevel): string[] {
  if (level === 'off' || level === 'advisory') return [];
  if (level === 'standard') return [WORKFLOW_CHAIN_LINE];
  return [WORKFLOW_CHAIN_LINE, STRICT_POSTURE_LINE];
}
