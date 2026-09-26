import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

import { portableJoin } from '@ogham/cross-platform';
import { afterEach, expect, it } from 'vitest';

import type {
  WorkflowIdentity,
  WorkflowRequest,
} from '../../../types/workflow.js';
import { completeInvocation } from '../workflow/completeInvocation.js';
import { observeBoundary } from '../workflow/observeBoundary.js';
import { observeInvocation } from '../workflow/observeInvocation.js';
import { transitionWorkflow } from '../workflow/transitionWorkflow.js';
import { withWorkflowState } from '../workflow/withWorkflowState.js';

const NOW = 1_700_000_000_000;
const roots: string[] = [];
function identity(): WorkflowIdentity {
  const root = mkdtempSync(portableJoin(tmpdir(), 'seiri-step-'));
  roots.push(root);
  mkdirSync(portableJoin(root, '.git'));
  return { root, actor: 'actor', turn: 'turn', call: 'call' };
}
function request(
  id: WorkflowIdentity,
  overrides: Partial<WorkflowRequest> = {},
): WorkflowRequest {
  return {
    action: 'step',
    project_root: id.root,
    task: 'task-a',
    step: 'write-plan',
    intent: 'change',
    ...overrides,
  };
}
/** Run one lifecycle request through the paired pre/post observation. */
function lifecycle(id: WorkflowIdentity, req: WorkflowRequest) {
  const hash = JSON.stringify(req);
  observeInvocation(id, hash, NOW, req);
  return completeInvocation(id, hash, NOW, (s) => transitionWorkflow(s, req));
}
function state(id: WorkflowIdentity) {
  return JSON.parse(
    readFileSync(portableJoin(id.root, '.seiri/sessions/actor.json'), 'utf8'),
  );
}
afterEach(() =>
  roots
    .splice(0)
    .forEach((root) => rmSync(root, { recursive: true, force: true })),
);

it.each(['write-plan', 'execute'] as const)(
  'entry step %s with no binding creates one',
  (step) => {
    const id = identity();
    observeBoundary(id, true, NOW);
    expect(lifecycle(id, request(id, { step }))).toBe('created');
    expect(state(id).binding.task).toBe('task-a');
    expect(state(id).binding.step).toBe(step);
  },
);
it('a non-entry step with no binding is rejected and creates nothing', () => {
  const id = identity();
  observeBoundary(id, true, NOW);
  const before = state(id);
  expect(lifecycle(id, request(id, { step: 'verify' }))).toBe('rejected');
  expect(state(id).binding).toBeUndefined();
  expect(state(id).generation).toBe(before.generation);
});
it('resume with no binding is rejected and creates nothing', () => {
  const id = identity();
  observeBoundary(id, true, NOW);
  expect(
    lifecycle(id, {
      action: 'resume',
      project_root: id.root,
      task: 'task-a',
      intent: 'change',
    }),
  ).toBe('rejected');
  expect(state(id).binding).toBeUndefined();
});
it.each(['write-plan', 'execute'] as const)(
  'entry step %s on the same active task only updates step',
  (step) => {
    const id = identity();
    observeBoundary(id, true, NOW);
    lifecycle(id, request(id, { step: 'write-plan' }));
    const before = state(id);
    expect(lifecycle({ ...id, call: 'second' }, request(id, { step }))).toBe(
      'updated',
    );
    const after = state(id);
    expect(after.binding.step).toBe(step);
    expect(after.generation).toBe(before.generation);
  },
);
it('a non-entry step on the same active task updates step only', () => {
  const id = identity();
  observeBoundary(id, true, NOW);
  lifecycle(id, request(id, { step: 'write-plan' }));
  const before = state(id);
  expect(
    lifecycle({ ...id, call: 'second' }, request(id, { step: 'verify' })),
  ).toBe('updated');
  const after = state(id);
  expect(after.binding.step).toBe('verify');
  expect(after.binding.task).toBe('task-a');
  expect(after.generation).toBe(before.generation);
});
it('a same-task step does not overwrite the binding intent it was created with', () => {
  const id = identity();
  observeBoundary(id, true, NOW);
  lifecycle(id, request(id, { step: 'write-plan', intent: 'change' }));
  // transitionWorkflow trusts the caller's resolved intent; the derivation
  // itself belongs to parseWorkflowRequest, so this passes the value it
  // would have derived for review-plan ('review') rather than undefined.
  expect(
    lifecycle(
      { ...id, call: 'review' },
      request(id, { step: 'review-plan', intent: 'review' }),
    ),
  ).toBe('updated');
  expect(state(id).binding.intent).toBe('change');
});
it('start on the same bound task restarts it from scratch rather than updating in place', () => {
  const id = identity();
  observeBoundary(id, true, NOW);
  lifecycle(id, request(id, { step: 'write-plan' }));
  const bash = { ...id, call: 'pending-bash' };
  observeInvocation(bash, 'echo OK', NOW);
  withWorkflowState(id, false, NOW, (s) => {
    s.binding!.counts['echo OK'] = 2;
    s.binding!.verdicts['echo OK'] = 'PASS';
  });
  const before = state(id);
  expect(
    lifecycle(
      { ...id, call: 'restart' },
      {
        action: 'start',
        project_root: id.root,
        task: 'task-a',
        intent: 'change',
      },
    ),
  ).toBe('created');
  const after = state(id);
  expect(after.binding.counts).toEqual({});
  expect(after.binding.verdicts).toEqual({});
  expect(after.generation).toBe(before.generation + 1);
  expect(
    completeInvocation(bash, 'echo OK', NOW, () => 'pending-effect'),
  ).toBeUndefined();
});
it('resume on the same active task updates without touching generation', () => {
  const id = identity();
  observeBoundary(id, true, NOW);
  lifecycle(id, request(id, { step: 'write-plan' }));
  const before = state(id);
  expect(
    lifecycle(
      { ...id, call: 'resume' },
      {
        action: 'resume',
        project_root: id.root,
        task: 'task-a',
        intent: 'change',
      },
    ),
  ).toBe('updated');
  expect(state(id).generation).toBe(before.generation);
});
it.each(['write-plan', 'verify'] as const)(
  'any step on the same paused task returns to active and updates step: %s',
  (step) => {
    const id = identity();
    observeBoundary(id, true, NOW);
    lifecycle(id, request(id, { step: 'write-plan' }));
    lifecycle(
      { ...id, call: 'pause' },
      {
        action: 'pause',
        project_root: id.root,
        task: 'task-a',
      },
    );
    expect(state(id).binding.state).toBe('suspended');
    expect(
      lifecycle({ ...id, call: `resume-${step}` }, request(id, { step })),
    ).toBe('updated');
    expect(state(id).binding.state).toBe('active');
    expect(state(id).binding.step).toBe(step);
  },
);
it('resume on the same paused task returns to active', () => {
  const id = identity();
  observeBoundary(id, true, NOW);
  lifecycle(id, request(id, { step: 'write-plan' }));
  lifecycle(
    { ...id, call: 'pause' },
    {
      action: 'pause',
      project_root: id.root,
      task: 'task-a',
    },
  );
  expect(
    lifecycle(
      { ...id, call: 'resume' },
      {
        action: 'resume',
        project_root: id.root,
        task: 'task-a',
        intent: 'change',
      },
    ),
  ).toBe('updated');
  expect(state(id).binding.state).toBe('active');
});
it.each(['write-plan', 'execute'] as const)(
  'entry step %s on a different task switches, resetting non-empty counts and verdicts',
  (step) => {
    const id = identity();
    observeBoundary(id, true, NOW);
    lifecycle(id, request(id, { step: 'write-plan' }));
    withWorkflowState(id, false, NOW, (s) => {
      s.binding!.counts['echo OK'] = 3;
      s.binding!.verdicts['echo OK'] = 'PASS';
    });
    const before = state(id);
    expect(before.binding.counts).not.toEqual({});
    expect(
      lifecycle(
        { ...id, call: 'switch' },
        request(id, { task: 'task-b', step }),
      ),
    ).toBe('switched');
    const after = state(id);
    expect(after.binding.task).toBe('task-b');
    expect(after.binding.counts).toEqual({});
    expect(after.binding.verdicts).toEqual({});
    expect(after.generation).toBe(before.generation + 1);
  },
);
it('entry step on a DIFFERENT task switches even when the prior binding is paused', () => {
  const id = identity();
  observeBoundary(id, true, NOW);
  lifecycle(id, request(id, { step: 'write-plan' }));
  lifecycle(
    { ...id, call: 'pause' },
    {
      action: 'pause',
      project_root: id.root,
      task: 'task-a',
    },
  );
  expect(state(id).binding.state).toBe('suspended');
  expect(
    lifecycle(
      { ...id, call: 'switch-from-paused' },
      request(id, { task: 'task-b', step: 'execute' }),
    ),
  ).toBe('switched');
  expect(state(id).binding.task).toBe('task-b');
  expect(state(id).binding.state).toBe('active');
});
it('a switched binding clears a pending Bash invocation observed under the prior binding', () => {
  const id = identity();
  observeBoundary(id, true, NOW);
  lifecycle(id, request(id, { step: 'write-plan' }));
  const bash = { ...id, call: 'switch-pending-bash' };
  observeInvocation(bash, 'echo pending', NOW);
  expect(
    lifecycle(
      { ...id, call: 'switch-clears' },
      request(id, { task: 'task-b', step: 'execute' }),
    ),
  ).toBe('switched');
  // Checked structurally, not only via completeInvocation: the generation
  // bump alone would already orphan the stale call, so this also confirms
  // the invocation table itself was cleared, not merely superseded.
  expect(state(id).invocations).toEqual({});
  expect(
    completeInvocation(bash, 'echo pending', NOW, () => 'pending-effect'),
  ).toBeUndefined();
});
it('a non-entry step on a different task is a mismatch and leaves state untouched', () => {
  const id = identity();
  observeBoundary(id, true, NOW);
  lifecycle(id, request(id, { step: 'write-plan' }));
  const before = state(id);
  expect(
    lifecycle(
      { ...id, call: 'other' },
      request(id, { task: 'task-b', step: 'verify' }),
    ),
  ).toBe('mismatch');
  expect(state(id).binding).toEqual(before.binding);
  expect(state(id).generation).toBe(before.generation);
});
it('resume for a different task is a mismatch and leaves state untouched', () => {
  const id = identity();
  observeBoundary(id, true, NOW);
  lifecycle(id, request(id, { step: 'write-plan' }));
  const before = state(id);
  expect(
    lifecycle(
      { ...id, call: 'other' },
      {
        action: 'resume',
        project_root: id.root,
        task: 'task-b',
        intent: 'change',
      },
    ),
  ).toBe('mismatch');
  expect(state(id).binding).toEqual(before.binding);
  expect(state(id).generation).toBe(before.generation);
});
it('a same-task step preserves a pending Bash invocation and its later verdict', () => {
  const id = identity();
  observeBoundary(id, true, NOW);
  lifecycle(id, request(id, { step: 'write-plan' }));
  const bash = { ...id, call: 'bash-pending' };
  observeInvocation(bash, 'echo OK', NOW);
  expect(
    lifecycle({ ...id, call: 'second-step' }, request(id, { step: 'verify' })),
  ).toBe('updated');
  expect(
    completeInvocation(bash, 'echo OK', NOW, () => 'verdict-recorded'),
  ).toBe('verdict-recorded');
});
it('pause bumps generation and clears a pending Bash invocation', () => {
  const id = identity();
  observeBoundary(id, true, NOW);
  lifecycle(id, request(id, { step: 'write-plan' }));
  observeInvocation({ ...id, call: 'pause-pending-bash' }, 'echo pending', NOW);
  const before = state(id);
  expect(
    lifecycle(
      { ...id, call: 'pause' },
      { action: 'pause', project_root: id.root, task: 'task-a' },
    ),
  ).toBe('updated');
  expect(state(id).generation).toBe(before.generation + 1);
  expect(state(id).invocations).toEqual({});
});
