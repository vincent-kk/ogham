import { readUtf8FileIfExistsSync } from '@ogham/cross-platform';

import type { WorkflowState } from '../../../types/workflow.js';

import { isWorkflowState } from './isWorkflowState.js';

/**
 * Read structurally valid state without hiding storage failures from the caller.
 * @param path Actor state file to read.
 * @returns Valid workflow state, or undefined when absent, invalid JSON or invalid state shape.
 * @throws A non-absence file read error so each caller applies its own failure policy.
 */
export function readState(path: string): WorkflowState | undefined {
  const content = readUtf8FileIfExistsSync(path);
  if (content === null) return undefined;
  try {
    const s: unknown = JSON.parse(content);
    return isWorkflowState(s) ? s : undefined;
  } catch {
    return undefined;
  }
}
