import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

import { portableJoin } from '@ogham/cross-platform';
import { afterEach, expect, it } from 'vitest';

import type {
  WorkflowIdentity,
  WorkflowRequest,
} from '../../../types/workflow.js';
import {
  completeInvocation,
  observeBoundary,
  observeInvocation,
  transitionWorkflow,
} from '../workflow/transitions.js';

const roots: string[] = [];
function fixture() {
  const root = mkdtempSync(portableJoin(tmpdir(), 'seiri-invocation-'));
  roots.push(root);
  mkdirSync(portableJoin(root, '.git'));
  const id: WorkflowIdentity = {
    root,
    actor: 'actor',
    turn: 'turn',
    call: 'start',
  };
  const req: WorkflowRequest = {
    action: 'start',
    task: 'task',
    intent: 'change',
    project_root: root,
  };
  observeBoundary(id, true);
  observeInvocation(id, 'start', req);
  completeInvocation(id, 'start', (state) => transitionWorkflow(state, req));
  return id;
}
afterEach(() =>
  roots
    .splice(0)
    .forEach((root) => rmSync(root, { recursive: true, force: true })),
);

it('consumes a Bash invocation only once, even if pre is replayed', () => {
  const id = { ...fixture(), call: 'bash' };
  observeInvocation(id, 'command');
  expect(completeInvocation(id, 'command', () => 'effect')).toBe('effect');
  observeInvocation(id, 'command');
  expect(completeInvocation(id, 'command', () => 'duplicate')).toBeUndefined();
});
it('rejects stale post after a new turn', () => {
  const id = { ...fixture(), call: 'bash' };
  observeInvocation(id, 'command');
  observeBoundary({ ...id, turn: 'next' }, true);
  expect(completeInvocation(id, 'command', () => 'stale')).toBeUndefined();
});
it('rejects late pre as well as post after a new turn', () => {
  const id = { ...fixture(), call: 'bash' };
  observeBoundary({ ...id, turn: 'next' }, true);
  observeInvocation(id, 'command');
  expect(completeInvocation(id, 'command', () => 'stale')).toBeUndefined();
});
it('does not let a late lifecycle result replace the current task', () => {
  const id = fixture();
  const first = {
    action: 'start',
    task: 'first',
    intent: 'review',
    project_root: id.root,
  } as const;
  const second = { ...first, task: 'second' };
  observeInvocation({ ...id, call: 'first' }, 'first', first);
  observeInvocation({ ...id, call: 'second' }, 'second', second);
  expect(
    completeInvocation({ ...id, call: 'second' }, 'second', (s) =>
      transitionWorkflow(s, second),
    ),
  ).toBe(true);
  expect(
    completeInvocation({ ...id, call: 'first' }, 'first', (s) =>
      transitionWorkflow(s, first),
    ),
  ).toBeUndefined();
  observeInvocation({ ...id, call: 'first' }, 'first', first);
  expect(
    completeInvocation({ ...id, call: 'first' }, 'first', () => 'replay'),
  ).toBeUndefined();
});
it('matches exact actor, turn, invocation and input without consuming a mismatch', () => {
  const id = { ...fixture(), call: 'bash' };
  observeInvocation(id, 'command');
  expect(
    completeInvocation({ ...id, actor: 'other' }, 'command', () => true),
  ).toBeUndefined();
  expect(
    completeInvocation({ ...id, turn: 'other' }, 'command', () => true),
  ).toBeUndefined();
  expect(
    completeInvocation({ ...id, call: 'other' }, 'command', () => true),
  ).toBeUndefined();
  expect(completeInvocation(id, 'other', () => true)).toBeUndefined();
  expect(completeInvocation(id, 'command', () => true)).toBe(true);
});
it('does not reactivate a resumed child with no trusted new boundary', () => {
  const id = fixture();
  observeBoundary(id, true, true);
  observeInvocation({ ...id, call: 'bash' }, 'command');
  expect(
    completeInvocation({ ...id, call: 'bash' }, 'command', () => true),
  ).toBeUndefined();
});
