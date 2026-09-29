import { INJECTION_PREFIX } from '../../../constants/plugin.js';
import { WORKFLOW_CHAIN_LINE } from '../../../constants/workflowChain.js';

/**
 * Render the fixed SessionStart chain summary as a standalone line.
 * @returns The chain line to inject.
 */
export function renderChainLine(): string {
  return `${INJECTION_PREFIX} ${WORKFLOW_CHAIN_LINE}`;
}
