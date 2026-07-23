import {
  STRICT_POSTURE_LINE,
  WORKFLOW_CHAIN_LINE,
} from '../../../../constants/intervention.js';
import type { InterventionLevel } from '../../../../types/config.js';

/**
 * How wide the automatic skills should fire at this dial position.
 *
 * Empty at `advisory`, which is the state the dispatch measurements were
 * taken against — saying nothing there keeps that baseline intact and
 * makes the dial a real opt-out rather than a volume knob that never
 * reaches zero.
 *
 * These lines do not create dispatch; the skill descriptions already do
 * that. They only move the edge — which borderline moments count, and
 * what a completion claim owes before it is made.
 */
export function renderPostureLines(level: InterventionLevel): string[] {
  if (level === 'advisory') return [];
  if (level === 'standard') return [WORKFLOW_CHAIN_LINE];
  return [WORKFLOW_CHAIN_LINE, STRICT_POSTURE_LINE];
}
