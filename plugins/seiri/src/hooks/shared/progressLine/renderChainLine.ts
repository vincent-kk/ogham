import { INJECTION_PREFIX } from '../../../constants/plugin.js';
import { WORKFLOW_CHAIN_LINE } from '../../../constants/workflowChain.js';

/**
 * The fixed one-line chain summary, injected in place of a progress line
 * when no binding is active.
 * @returns The chain line to inject.
 */
export function renderChainLine(): string {
  return `${INJECTION_PREFIX} ${WORKFLOW_CHAIN_LINE}`;
}
