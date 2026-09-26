import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
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

const NOW = 1_700_000_000_000;
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
  observeBoundary(id, true, NOW);
  observeInvocation(id, 'start', NOW, req);
  completeInvocation(id, 'start', NOW, (state) =>
    transitionWorkflow(state, req),
  );
  return id;
}
afterEach(() =>
  roots
    .splice(0)
    .forEach((root) => rmSync(root, { recursive: true, force: true })),
);

it('consumes a Bash invocation only once, even if pre is replayed', () => {
  const id = { ...fixture(), call: 'bash' };
  observeInvocation(id, 'command', NOW);
  expect(completeInvocation(id, 'command', NOW, () => 'effect')).toBe(
    'effect',
  );
  observeInvocation(id, 'command', NOW);
  expect(
    completeInvocation(id, 'command', NOW, () => 'duplicate'),
  ).toBeUndefined();
});
it('rejects stale post after a new turn', () => {
  const id = { ...fixture(), call: 'bash' };
  observeInvocation(id, 'command', NOW);
  observeBoundary({ ...id, turn: 'next' }, true, NOW);
  expect(
    completeInvocation(id, 'command', NOW, () => 'stale'),
  ).toBeUndefined();
});
it('rejects late pre as well as post after a new turn', () => {
  const id = { ...fixture(), call: 'bash' };
  observeBoundary({ ...id, turn: 'next' }, true, NOW);
  observeInvocation(id, 'command', NOW);
  expect(
    completeInvocation(id, 'command', NOW, () => 'stale'),
  ).toBeUndefined();
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
  observeInvocation({ ...id, call: 'first' }, 'first', NOW, first);
  observeInvocation({ ...id, call: 'second' }, 'second', NOW, second);
  expect(
    completeInvocation({ ...id, call: 'second' }, 'second', NOW, (s) =>
      transitionWorkflow(s, second),
    ),
  ).toBe('switched');
  expect(
    completeInvocation({ ...id, call: 'first' }, 'first', NOW, (s) =>
      transitionWorkflow(s, first),
    ),
  ).toBeUndefined();
  observeInvocation({ ...id, call: 'first' }, 'first', NOW, first);
  expect(
    completeInvocation({ ...id, call: 'first' }, 'first', NOW, () => 'replay'),
  ).toBeUndefined();
});
it('matches exact actor, turn, invocation and input without consuming a mismatch', () => {
  const id = { ...fixture(), call: 'bash' };
  observeInvocation(id, 'command', NOW);
  expect(
    completeInvocation({ ...id, actor: 'other' }, 'command', NOW, () => true),
  ).toBeUndefined();
  expect(
    completeInvocation({ ...id, turn: 'other' }, 'command', NOW, () => true),
  ).toBeUndefined();
  expect(
    completeInvocation({ ...id, call: 'other' }, 'command', NOW, () => true),
  ).toBeUndefined();
  expect(completeInvocation(id, 'other', NOW, () => true)).toBeUndefined();
  expect(completeInvocation(id, 'command', NOW, () => true)).toBe(true);
});
it('does not reactivate a resumed child with no trusted new boundary', () => {
  const id = fixture();
  observeBoundary(id, true, NOW, { firstChild: true });
  observeInvocation({ ...id, call: 'bash' }, 'command', NOW);
  expect(
    completeInvocation({ ...id, call: 'bash' }, 'command', NOW, () => true),
  ).toBeUndefined();
});
