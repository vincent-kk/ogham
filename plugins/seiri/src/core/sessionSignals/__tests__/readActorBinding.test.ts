import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
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
import { readActorBinding } from '../workflow/readActorBinding.js';
import { transitionWorkflow } from '../workflow/transitionWorkflow.js';

const NOW = 1_700_000_000_000;
const roots: string[] = [];
function fixture(): { id: WorkflowIdentity; path: string } {
  const root = mkdtempSync(portableJoin(tmpdir(), 'seiri-read-binding-'));
  roots.push(root);
  mkdirSync(portableJoin(root, '.git'));
  const id: WorkflowIdentity = {
    root,
    actor: 'main',
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
  return { id, path: portableJoin(root, '.seiri/sessions/main.json') };
}
afterEach(() =>
  roots
    .splice(0)
    .forEach((root) => rmSync(root, { recursive: true, force: true })),
);

it('returns the active binding of a structurally valid, fresh, non-revoked actor', () => {
  const { id } = fixture();
  expect(readActorBinding(id, NOW)?.task).toBe('task-a');
});
it('returns undefined for a suspended binding', () => {
  const { id } = fixture();
  observeBoundary({ ...id, turn: 'next' }, true, NOW, { suspend: true });
  expect(readActorBinding(id, NOW)).toBeUndefined();
});
it('returns undefined once the actor TTL has expired', () => {
  const { id, path } = fixture();
  const stale = JSON.parse(readFileSync(path, 'utf8'));
  stale.lastObservedAt -= 8 * 24 * 60 * 60 * 1000;
  writeFileSync(path, JSON.stringify(stale));
  expect(readActorBinding(id, NOW)).toBeUndefined();
});
it('returns undefined once the actor is revoked', () => {
  const { id, path } = fixture();
  writeFileSync(`${path}.revoked`, 'revoked');
  expect(readActorBinding(id, NOW)).toBeUndefined();
});
it('returns undefined for corrupt JSON', () => {
  const { id, path } = fixture();
  writeFileSync(path, '{ not json');
  expect(readActorBinding(id, NOW)).toBeUndefined();
});
it('returns undefined for a different root', () => {
  const { id } = fixture();
  const other = mkdtempSync(
    portableJoin(tmpdir(), 'seiri-read-binding-other-'),
  );
  roots.push(other);
  mkdirSync(portableJoin(other, '.git'));
  expect(readActorBinding({ ...id, root: other }, NOW)).toBeUndefined();
});
it('reads the parent main actor from a child identity that names it', () => {
  const { id } = fixture();
  const mainIdentity: WorkflowIdentity = { root: id.root, actor: 'main' };
  expect(readActorBinding(mainIdentity, NOW)?.task).toBe('task-a');
});
it('returns undefined while the actor lock is held', () => {
  const { id, path } = fixture();
  mkdirSync(`${path}.lock`);
  expect(readActorBinding(id, NOW)).toBeUndefined();
});
