import { readFileSync } from 'node:fs';

import type { WorkflowState } from '../../../types/workflow.js';

import { isWorkflowState } from './isWorkflowState.js';

/** Read a structurally valid state; malformed metadata cannot activate assistance. */
export function readState(path: string): WorkflowState | undefined {
  try {
    const s: unknown = JSON.parse(readFileSync(path, 'utf8'));
    return isWorkflowState(s) ? s : undefined;
  } catch {
    return undefined;
  }
}
