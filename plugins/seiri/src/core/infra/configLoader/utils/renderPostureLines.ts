import {
  STRICT_POSTURE_LINE,
  WORKFLOW_CHAIN_LINE,
} from '../../../../constants/postureLines.js';
import type { InterventionLevel } from '../../../../types/config.js';

/**
 * How wide the automatic skills should fire at this dial position.
 *
 * Empty at `off` and `advisory`. The former disables every hook surface;
 * the latter retains status reporting without workflow-chain posture.
 *
 * These lines do not create dispatch; the skill descriptions already do
 * that. They only move the edge — which borderline moments count, and
 * what a completion claim owes before it is made.
 */
export function renderPostureLines(level: InterventionLevel): string[] {
  if (level === 'off' || level === 'advisory') return [];
  if (level === 'standard') return [WORKFLOW_CHAIN_LINE];
  return [WORKFLOW_CHAIN_LINE, STRICT_POSTURE_LINE];
}
