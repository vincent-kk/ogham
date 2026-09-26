import { STEP_PHRASES } from '../../../constants/workflowChain.js';
import type { WorkflowStep } from '../../../types/workflow.js';

import { renderChainSegment } from './renderChainSegment.js';

/**
 * The chain segment alone when no step is recorded, or followed by its
 * phrase when one is.
 * @param step Chain skill recorded on the binding, when one is.
 * @returns The chain segment, with its phrase appended when `step` is set.
 */
export function renderProgressBody(step?: WorkflowStep): string {
  const segment = renderChainSegment(step);
  return step ? `${segment} — ${STEP_PHRASES[step]}` : segment;
}
