import { INJECTION_PREFIX } from '../../../constants/plugin.js';
import {
  WORKFLOW_ENTRY_LINE_STANDARD,
  WORKFLOW_ENTRY_LINE_STRICT,
} from '../../../constants/workflowChain.js';

/**
 * Render the selected dial's entry guidance when no task is active.
 * @param level Effective standard or strict intervention level.
 * @returns The prefixed line to inject on this user turn.
 */
export function renderEntryLine(level: 'standard' | 'strict'): string {
  const line =
    level === 'strict'
      ? WORKFLOW_ENTRY_LINE_STRICT
      : WORKFLOW_ENTRY_LINE_STANDARD;
  return `${INJECTION_PREFIX} ${line}`;
}
