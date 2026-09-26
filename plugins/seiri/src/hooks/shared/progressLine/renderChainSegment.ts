import {
  MAIN_CHAIN_STEPS,
  OFF_CHAIN_STEPS,
} from '../../../constants/workflowChain.js';
import type { WorkflowStep } from '../../../types/workflow.js';

/**
 * The main chain, current step bracketed; an off-chain step appends after
 * it instead of bracketing a position within it.
 * @param step Chain skill recorded on the binding, when one is.
 * @returns The chain segment, bracketed or appended at `step`.
 */
export function renderChainSegment(step?: WorkflowStep): string {
  const names = MAIN_CHAIN_STEPS.map((name) =>
    name === step ? `[${name}]` : name,
  );
  const segment = names.join(' → ');
  return step && (OFF_CHAIN_STEPS as readonly string[]).includes(step)
    ? `${segment} · now: [${step}]`
    : segment;
}
