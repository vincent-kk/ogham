import { readFileSync } from 'node:fs';

import type { WorkflowState } from '../../../types/workflow.js';

import { isWorkflowState } from './isWorkflowState.js';

/**
 * Read structurally valid state without hiding storage failures from the caller.
 * @param path Actor state file to read.
 * @returns Valid workflow state, or undefined for invalid JSON or state shape.
 * @throws The file read error so each caller applies its own failure policy.
 */
export function readState(path: string): WorkflowState | undefined {
  const content = readFileSync(path, 'utf8');
  try {
    const s: unknown = JSON.parse(content);
    return isWorkflowState(s) ? s : undefined;
  } catch {
    return undefined;
  }
}
