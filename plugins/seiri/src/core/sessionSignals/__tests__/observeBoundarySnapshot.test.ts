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
function boundBinding(): WorkflowIdentity {
  const root = mkdtempSync(portableJoin(tmpdir(), 'seiri-boundary-snap-'));
  roots.push(root);
  mkdirSync(portableJoin(root, '.git'));
  const id: WorkflowIdentity = {
    root,
    actor: 'actor',
    turn: 'turn',
    call: 'call',
  };
  const request: WorkflowRequest = {
    action: 'step',
    project_root: root,
    task: 'task-a',
    step: 'write-plan',
    intent: 'change',
  };
  observeBoundary(id, true, NOW);
  observeInvocation(id, 'hash', NOW, request);
  completeInvocation(id, 'hash', NOW, (s) => transitionWorkflow(s, request));
  return id;
}
afterEach(() =>
  roots
    .splice(0)
    .forEach((root) => rmSync(root, { recursive: true, force: true })),
);

it('returns the suspended binding when this boundary suspends it', () => {
  const id = boundBinding();
  const snapshot = observeBoundary({ ...id, turn: 'next' }, true, NOW, {
    suspend: true,
  });
  expect(snapshot?.task).toBe('task-a');
  expect(snapshot?.state).toBe('suspended');
});
it('returns the same active binding when this boundary does not suspend it', () => {
  const id = boundBinding();
  const snapshot = observeBoundary({ ...id, turn: 'next' }, true, NOW, {
    suspend: false,
  });
  expect(snapshot?.task).toBe('task-a');
  expect(snapshot?.state).toBe('active');
});
it('returns undefined when there is no binding at all', () => {
  const root = mkdtempSync(
    portableJoin(tmpdir(), 'seiri-boundary-snap-empty-'),
  );
  roots.push(root);
  mkdirSync(portableJoin(root, '.git'));
  const id: WorkflowIdentity = { root, actor: 'actor', turn: 'turn' };
  expect(observeBoundary(id, true, NOW)).toBeUndefined();
});
