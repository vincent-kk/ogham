import { randomUUID } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';

import { portableJoin } from '@ogham/cross-platform';
import { afterEach, expect, it } from 'vitest';

import type { WorkflowRequest } from '../../../types/workflow.js';
import { completeInvocation } from '../workflow/completeInvocation.js';
import { observeBoundary } from '../workflow/observeBoundary.js';
import { observeInvocation } from '../workflow/observeInvocation.js';
import { prepareDirectory } from '../workflow/prepareDirectory.js';
import { readActorBinding } from '../workflow/readActorBinding.js';
import { suspendActor } from '../workflow/suspendActor.js';
import { transitionWorkflow } from '../workflow/transitionWorkflow.js';
import { advanceBoundary } from '../workflow/utils/advanceBoundary.js';
import { withWorkflowState } from '../workflow/withWorkflowState.js';

const NOW = 1_700_000_000_000;
const roots: string[] = [];
function fixture() {
  const root = mkdtempSync(portableJoin(tmpdir(), 'seiri-isolation-'));
  roots.push(root);
  mkdirSync(portableJoin(root, '.git'));
  const id = { root, actor: 'actor', turn: 'turn' };
  const path = portableJoin(root, '.seiri/sessions/actor.json');
  return { id, path };
}
/** An actor fixture with an active `task-a` binding, for quarantine-recovery cases. */
function boundFixture() {
  const { id, path } = fixture();
  const bound = { ...id, call: 'call' };
  const request: WorkflowRequest = {
    action: 'step',
    project_root: id.root,
    task: 'task-a',
    step: 'write-plan',
    intent: 'change',
  };
  observeBoundary(id, true, NOW);
  observeInvocation(bound, 'hash', NOW, request);
  completeInvocation(bound, 'hash', NOW, (s) => transitionWorkflow(s, request));
  return { id, path };
}
afterEach(() =>
  roots
    .splice(0)
    .forEach((root) => rmSync(root, { recursive: true, force: true })),
);

it('does not mutate or run effects without the actor lock', () => {
  const { id, path } = fixture();
  observeBoundary(id, true, NOW);
  mkdirSync(`${path}.lock`);
  const before = readFileSync(path, 'utf8');
  let effects = 0;
  expect(withWorkflowState(id, false, NOW, () => effects++)).toBeUndefined();
  expect(effects).toBe(0);
  expect(readFileSync(path, 'utf8')).toBe(before);
});
it('quarantines subsequent automatic effects when a boundary cannot acquire its lock', () => {
  const { id, path } = fixture();
  observeBoundary(id, true, NOW);
  mkdirSync(`${path}.lock`);
  observeBoundary({ ...id, turn: 'next' }, true, NOW);
  rmSync(`${path}.lock`, { recursive: true });
  expect(existsSync(`${path}.revoked`)).toBe(true);
  expect(
    withWorkflowState(id, prepareDirectory, NOW, () => 'effect'),
  ).toBeUndefined();
});
it('refuses Pre/Post observations and readActorBinding while quarantined, then recovers at the next UPS boundary', () => {
  const { id, path } = boundFixture();
  const pending = { ...id, call: 'pending-call' };
  observeInvocation(pending, 'pending-hash', NOW);
  const beforeQuarantine = JSON.parse(readFileSync(path, 'utf8'));
  expect(Object.keys(beforeQuarantine.invocations)).toContain('pending-call');

  mkdirSync(`${path}.lock`);
  observeBoundary({ ...id, turn: 'next' }, true, NOW);
  rmSync(`${path}.lock`, { recursive: true });
  expect(existsSync(`${path}.revoked`)).toBe(true);

  observeInvocation({ ...id, call: 'late-call' }, 'late-hash', NOW);
  const duringQuarantine = JSON.parse(readFileSync(path, 'utf8'));
  expect(Object.keys(duringQuarantine.invocations)).not.toContain('late-call');
  expect(
    completeInvocation(pending, 'pending-hash', NOW, () => 'effect'),
  ).toBeUndefined();
  expect(
    readActorBinding({ root: id.root, actor: id.actor }, NOW),
  ).toBeUndefined();
  expect(existsSync(`${path}.revoked`)).toBe(true);

  const snapshot = observeBoundary({ ...id, turn: 'recovered' }, true, NOW);

  expect(existsSync(`${path}.revoked`)).toBe(false);
  expect(snapshot).toEqual(
    expect.objectContaining({ task: 'task-a', state: 'active' }),
  );
  expect(readActorBinding({ root: id.root, actor: id.actor }, NOW)?.task).toBe(
    'task-a',
  );
});
it('does not delete a marker a concurrent failing boundary wrote during this transaction', () => {
  const { id, path } = boundFixture();
  const outer = { ...id, turn: 'next' };

  const result = withWorkflowState(
    outer,
    prepareDirectory,
    NOW,
    (state) => {
      suspendActor(id, NOW);
      return advanceBoundary(state, outer.turn, false);
    },
    { revokeOnFailure: true, recover: { suspend: false } },
  );

  expect(result).toEqual(
    expect.objectContaining({ task: 'task-a', state: 'active' }),
  );
  expect(existsSync(`${path}.revoked`)).toBe(true);
  expect(existsSync(`${path}.revoked-suspend`)).toBe(true);
  expect(
    readActorBinding({ root: id.root, actor: id.actor }, NOW),
  ).toBeUndefined();
});
it('when a marker predates this transaction, removes only the token it saw — a marker rewritten mid-transaction stays', () => {
  const { id, path } = boundFixture();
  mkdirSync(`${path}.lock`);
  observeBoundary({ ...id, turn: 'stale-fail' }, true, NOW);
  rmSync(`${path}.lock`, { recursive: true });
  expect(existsSync(`${path}.revoked`)).toBe(true);
  const seenBeforeOuter = readFileSync(`${path}.revoked`, 'utf8');

  const outer = { ...id, turn: 'recovered' };
  const result = withWorkflowState(
    outer,
    prepareDirectory,
    NOW,
    (state) => {
      suspendActor(id, NOW);
      return advanceBoundary(state, outer.turn, false);
    },
    { revokeOnFailure: true, recover: { suspend: false } },
  );

  expect(result).toEqual(
    expect.objectContaining({ task: 'task-a', state: 'active' }),
  );
  expect(existsSync(`${path}.revoked`)).toBe(true);
  expect(readFileSync(`${path}.revoked`, 'utf8')).not.toBe(seenBeforeOuter);
});
it('applies a failed SessionStart suspend-intent at the next standard UPS boundary, suspending the binding', () => {
  const { id, path } = boundFixture();
  mkdirSync(`${path}.lock`);
  suspendActor(id, NOW);
  rmSync(`${path}.lock`, { recursive: true });
  expect(existsSync(`${path}.revoked`)).toBe(true);
  expect(existsSync(`${path}.revoked-suspend`)).toBe(true);

  const snapshot = observeBoundary({ ...id, turn: 'ups-turn' }, true, NOW, {
    suspend: false,
  });

  expect(snapshot).toEqual(
    expect.objectContaining({ task: 'task-a', state: 'suspended' }),
  );
  expect(existsSync(`${path}.revoked`)).toBe(false);
  expect(existsSync(`${path}.revoked-suspend`)).toBe(false);
  expect(
    readActorBinding({ root: id.root, actor: id.actor }, NOW),
  ).toBeUndefined();
});
it('does not apply suspend at recovery when the failed transaction carried no suspend intent', () => {
  const { id, path } = boundFixture();
  mkdirSync(`${path}.lock`);
  observeBoundary({ ...id, turn: 'ups-fail' }, true, NOW, { suspend: false });
  rmSync(`${path}.lock`, { recursive: true });
  expect(existsSync(`${path}.revoked`)).toBe(true);
  expect(existsSync(`${path}.revoked-suspend`)).toBe(false);

  const snapshot = observeBoundary(
    { ...id, turn: 'ups-recovered' },
    true,
    NOW,
    { suspend: false },
  );

  expect(snapshot).toEqual(
    expect.objectContaining({ task: 'task-a', state: 'active' }),
  );
  expect(existsSync(`${path}.revoked`)).toBe(false);
});
it('recovers a quarantined actor through suspendActor, suspending the binding as SessionStart always does', () => {
  const { id, path } = boundFixture();
  mkdirSync(`${path}.lock`);
  observeBoundary({ ...id, turn: 'next' }, true, NOW);
  rmSync(`${path}.lock`, { recursive: true });
  expect(existsSync(`${path}.revoked`)).toBe(true);

  const snapshot = suspendActor(id, NOW);

  expect(existsSync(`${path}.revoked`)).toBe(false);
  expect(snapshot).toEqual(
    expect.objectContaining({ task: 'task-a', state: 'suspended' }),
  );
});
it('keeps the quarantine marker when the recovering boundary also fails to acquire its lock', () => {
  const { id, path } = boundFixture();
  mkdirSync(`${path}.lock`);
  observeBoundary({ ...id, turn: 'next' }, true, NOW);
  rmSync(`${path}.lock`, { recursive: true });
  expect(existsSync(`${path}.revoked`)).toBe(true);

  mkdirSync(`${path}.lock`);
  const snapshot = observeBoundary({ ...id, turn: 'still-blocked' }, true, NOW);
  rmSync(`${path}.lock`, { recursive: true });

  expect(snapshot).toBeUndefined();
  expect(existsSync(`${path}.revoked`)).toBe(true);
});
it('discards invocations recorded before the failure so they cannot complete after recovery', () => {
  const { id, path } = boundFixture();
  const bash = { ...id, call: 'bash-call' };
  observeInvocation(bash, 'cmd-hash', NOW);
  const before = JSON.parse(readFileSync(path, 'utf8'));
  expect(Object.keys(before.invocations)).toContain('bash-call');

  mkdirSync(`${path}.lock`);
  observeBoundary({ ...id, turn: 'next' }, true, NOW);
  rmSync(`${path}.lock`, { recursive: true });
  expect(existsSync(`${path}.revoked`)).toBe(true);

  observeBoundary({ ...id, turn: 'recovered' }, true, NOW);
  expect(existsSync(`${path}.revoked`)).toBe(false);

  expect(
    completeInvocation(bash, 'cmd-hash', NOW, () => 'effect'),
  ).toBeUndefined();
});
it('does not overwrite a user-owned ignore file or create unignored metadata', () => {
  const { id, path } = fixture();
  mkdirSync(portableJoin(id.root, '.seiri'));
  const ignore = portableJoin(id.root, '.seiri/.gitignore');
  writeFileSync(ignore, 'runtime.json\n');
  observeBoundary(id, true, NOW);
  expect(existsSync(path)).toBe(false);
  expect(readFileSync(ignore, 'utf8')).toBe('runtime.json\n');
});
it('rejects corrupted state until a trusted fresh boundary', () => {
  const { id, path } = fixture();
  observeBoundary(id, true, NOW);
  writeFileSync(path, '{broken');
  expect(withWorkflowState(id, false, NOW, () => 'effect')).toBeUndefined();
  observeBoundary({ ...id, turn: 'next' }, true, NOW);
  expect(withWorkflowState(id, false, NOW, (s) => s.turn)).toBe('next');
});
it('expires old actor state before removing its revocation marker', () => {
  const { id, path } = fixture();
  observeBoundary(id, true, NOW);
  const state = JSON.parse(readFileSync(path, 'utf8'));
  state.lastObservedAt -= 8 * 24 * 60 * 60 * 1000;
  writeFileSync(path, JSON.stringify(state));
  writeFileSync(`${path}.revoked`, 'revoked');
  expect(withWorkflowState(id, false, NOW, () => 'effect')).toBeUndefined();
  expect(existsSync(path)).toBe(false);
  expect(existsSync(`${path}.revoked`)).toBe(false);
});
it('prunes stale invocations while retaining the active actor', () => {
  const { id } = fixture();
  observeBoundary(id, true, NOW);
  withWorkflowState(id, false, NOW, (s) => {
    s.invocations.old = {
      kind: 'bash',
      generation: s.generation,
      turn: 'turn',
      inputHash: 'hash',
      startedAt: 0,
    };
  });
  expect(
    withWorkflowState(id, false, NOW, (s) => Object.keys(s.invocations)),
  ).toEqual([]);
});
it('stays quarantined on a lingering suspend-intent marker even after a concurrent transaction clears .revoked', () => {
  const { id, path } = boundFixture();
  writeFileSync(`${path}.revoked`, randomUUID());

  const recovered = withWorkflowState(
    { ...id, turn: 'A' },
    false,
    NOW,
    (state) => {
      // Simulates a second failing transaction writing the sticky
      // suspend-intent marker in the gap between this call's token read
      // and its commit.
      writeFileSync(`${path}.revoked-suspend`, randomUUID());
      return advanceBoundary(state, 'A', false);
    },
    { revokeOnFailure: true, recover: { suspend: false } },
  );

  expect(recovered).toEqual(
    expect.objectContaining({ task: 'task-a', state: 'active' }),
  );
  expect(existsSync(`${path}.revoked`)).toBe(false);
  expect(existsSync(`${path}.revoked-suspend`)).toBe(true);
  expect(
    readActorBinding({ root: id.root, actor: id.actor }, NOW),
  ).toBeUndefined();

  const startRequest: WorkflowRequest = {
    action: 'start',
    project_root: id.root,
    task: 'task-b',
    intent: 'change',
  };
  const late = { ...id, turn: 'A', call: 'late-start' };
  observeInvocation(late, 'late-hash', NOW, startRequest);
  expect(
    completeInvocation(late, 'late-hash', NOW, (s) =>
      transitionWorkflow(s, startRequest),
    ),
  ).toBeUndefined();

  const state = JSON.parse(readFileSync(path, 'utf8'));
  expect(state.invocations['late-start']).toBeUndefined();
  expect(state.binding.task).toBe('task-a');

  const finalSnapshot = observeBoundary({ ...id, turn: 'B' }, true, NOW, {
    suspend: false,
  });
  expect(finalSnapshot).toEqual(
    expect.objectContaining({ task: 'task-a', state: 'suspended' }),
  );
  expect(existsSync(`${path}.revoked-suspend`)).toBe(false);
});
