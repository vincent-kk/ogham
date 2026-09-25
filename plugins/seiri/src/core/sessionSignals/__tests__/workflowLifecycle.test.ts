import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from 'node:fs';
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
function identity(): WorkflowIdentity {
  const root = mkdtempSync(portableJoin(tmpdir(), 'seiri-lifecycle-'));
  roots.push(root);
  mkdirSync(portableJoin(root, '.git'));
  return { root, actor: 'actor', turn: 'turn', call: 'call' };
}
function request(
  root: string,
  action: WorkflowRequest['action'] = 'start',
  task = 'task-a',
): WorkflowRequest {
  return {
    action,
    project_root: root,
    task,
    ...(['start', 'resume'].includes(action)
      ? { intent: 'change' as const }
      : {}),
  };
}
function lifecycle(id: WorkflowIdentity, req: WorkflowRequest) {
  const hash = JSON.stringify(req);
  observeInvocation(id, hash, req);
  return completeInvocation(id, hash, (s) => transitionWorkflow(s, req));
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

it('requires a trusted boundary before start and does not create a ledger', () => {
  const id = identity();
  expect(lifecycle(id, request(id.root))).toBeUndefined();
  observeBoundary(id, true);
  expect(lifecycle(id, request(id.root))).toBe(true);
  expect(state(id).binding.task).toBe('task-a');
  expect(readdirSync(portableJoin(id.root, '.seiri')).sort()).toEqual([
    '.gitignore',
    'sessions',
  ]);
});
it('suspends at the next turn and requires explicit resume', () => {
  const id = identity();
  observeBoundary(id, true);
  lifecycle(id, request(id.root));
  const next = { ...id, turn: 'next', call: 'resume' };
  observeBoundary(next, true);
  expect(state(id).binding.state).toBe('suspended');
  expect(lifecycle(next, request(id.root, 'resume'))).toBe(true);
  expect(state(id).binding.state).toBe('active');
});
it('pauses and finishes participation without changing task outcome', () => {
  const id = identity();
  observeBoundary(id, true);
  lifecycle(id, request(id.root));
  expect(lifecycle({ ...id, call: 'pause' }, request(id.root, 'pause'))).toBe(
    true,
  );
  expect(state(id).binding.state).toBe('suspended');
  expect(lifecycle({ ...id, call: 'finish' }, request(id.root, 'finish'))).toBe(
    true,
  );
  expect(state(id).binding).toBeUndefined();
});
it('rejects resume for a different task, but permits explicit replacement', () => {
  const id = identity();
  observeBoundary(id, true);
  lifecycle(id, request(id.root));
  expect(
    lifecycle({ ...id, call: 'wrong' }, request(id.root, 'resume', 'task-b')),
  ).toBe(false);
  expect(state(id).binding.task).toBe('task-a');
  expect(
    lifecycle({ ...id, call: 'replace' }, request(id.root, 'start', 'task-b')),
  ).toBe(true);
  expect(state(id).binding.task).toBe('task-b');
});
it('does not inherit participation into a child actor', () => {
  const id = identity();
  observeBoundary(id, true);
  lifecycle(id, request(id.root));
  const child = { ...id, actor: 'child', turn: 'child-turn' };
  observeBoundary(child, true, true);
  expect(completeInvocation(child, 'bash', () => 'effect')).toBeUndefined();
  expect(lifecycle(child, request(id.root, 'start', 'child-task'))).toBe(true);
  expect(state(id).binding.task).toBe('task-a');
});
it('drops anchors at disabled boundaries, including a boundary without a binding', () => {
  const id = identity();
  observeBoundary(id, true);
  observeBoundary({ ...id, turn: 'disabled' }, false);
  expect(lifecycle(id, request(id.root))).toBeUndefined();
  expect(state(id).turn).toBeUndefined();
});
