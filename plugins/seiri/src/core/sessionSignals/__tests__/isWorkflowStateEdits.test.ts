import { expect, it } from 'vitest';

import { EDIT_TRACKED_FILES_CAP } from '../../../constants/editNotice.js';
import type { WorkflowState } from '../../../types/workflow.js';
import { isWorkflowState } from '../workflow/isWorkflowState.js';
import { advanceBoundary } from '../workflow/utils/advanceBoundary.js';

/**
 * A valid unbound actor, optionally carrying an edit record.
 * @param edits Value stored under `edits`; omitted when `undefined`.
 * @returns The candidate state.
 */
function stateWith(edits?: unknown): Record<string, unknown> {
  return {
    version: 1,
    generation: 1,
    turn: 'turn-a',
    lastObservedAt: 0,
    invocations: {},
    seen: [],
    ...(edits === undefined ? {} : { edits }),
  };
}

it('accepts a stored actor with no edit record', () => {
  expect(isWorkflowState(stateWith())).toBe(true);
});

it('accepts an edit record within its cap and notice kinds', () => {
  expect(
    isWorkflowState(stateWith({ files: ['h1', 'h2'], notices: ['first'] })),
  ).toBe(true);
});

it('rejects an edit record over the file cap', () => {
  const files = Array.from(
    { length: EDIT_TRACKED_FILES_CAP + 1 },
    (_, n) => `h${n}`,
  );
  expect(isWorkflowState(stateWith({ files, notices: [] }))).toBe(false);
});

it('rejects an unknown notice kind or a malformed record', () => {
  expect(isWorkflowState(stateWith({ files: [], notices: ['later'] }))).toBe(
    false,
  );
  expect(isWorkflowState(stateWith({ files: [1], notices: [] }))).toBe(false);
  expect(isWorkflowState(stateWith(['h1']))).toBe(false);
});

it('clears the edit record at a turn boundary', () => {
  const state: WorkflowState = {
    version: 1,
    generation: 1,
    turn: 'turn-a',
    lastObservedAt: 0,
    invocations: {},
    seen: [],
    edits: { files: ['h1'], notices: ['first'] },
  };
  advanceBoundary(state, 'turn-b', false);
  expect(state.edits).toBeUndefined();
  expect(state.turn).toBe('turn-b');
});
