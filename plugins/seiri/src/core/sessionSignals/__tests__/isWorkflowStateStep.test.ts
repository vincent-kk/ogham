import { expect, it } from 'vitest';

import type { WorkflowState } from '../../../types/workflow.js';
import { isWorkflowState } from '../workflow/isWorkflowState.js';

function baseState(binding: Record<string, unknown>): unknown {
  return {
    version: 1,
    generation: 0,
    lastObservedAt: 0,
    invocations: {},
    seen: [],
    binding: {
      task: 'task-a',
      intent: 'change',
      state: 'active',
      counts: {},
      announced: [],
      verdicts: {},
      ...binding,
    },
  };
}

it('accepts a binding with a valid WorkflowStep', () => {
  expect(isWorkflowState(baseState({ step: 'write-plan' }))).toBe(true);
});
it('accepts a binding with no step at all', () => {
  expect(isWorkflowState(baseState({}))).toBe(true);
});
it('rejects a binding whose step is not a WorkflowStep', () => {
  expect(
    isWorkflowState(baseState({ step: 'not-a-skill' }) as WorkflowState),
  ).toBe(false);
});
