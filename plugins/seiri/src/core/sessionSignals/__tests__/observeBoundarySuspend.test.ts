import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

import { portableJoin } from '@ogham/cross-platform';
import { afterEach, expect, it } from 'vitest';

import { completeInvocation } from '../workflow/completeInvocation.js';
import { observeBoundary } from '../workflow/observeBoundary.js';
import { observeInvocation } from '../workflow/observeInvocation.js';
import { transitionWorkflow } from '../workflow/transitionWorkflow.js';

import { seedActor } from './helpers/seedActor.js';

/** Fixed observation clock for the suspension transaction. */
const NOW = 1_700_000_000_000;
/** Isolated repositories removed after each case. */
const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

it('suspends an existing binding, clears pending calls and unanchors the actor', () => {
  const root = mkdtempSync(portableJoin(tmpdir(), 'seiri-boundary-suspend-'));
  roots.push(root);
  mkdirSync(portableJoin(root, '.git'));
  const id = { root, actor: 'actor', turn: 'turn', call: 'entry' };
  seedActor(id, NOW);
  const request = {
    action: 'step',
    project_root: root,
    task: 'task-a',
    step: 'write-plan',
    intent: 'change',
  } as const;
  observeInvocation(id, 'hash', NOW, request);
  completeInvocation(id, 'hash', NOW, (state) =>
    transitionWorkflow(state, request),
  );
  observeInvocation({ ...id, call: 'bash' }, 'command', NOW);
  const path = portableJoin(root, '.seiri/sessions/actor.json');
  const before = JSON.parse(readFileSync(path, 'utf8'));

  const binding = observeBoundary(id, false, NOW, { suspend: true });

  expect(binding).toEqual(
    expect.objectContaining({ task: 'task-a', state: 'suspended' }),
  );
  const after = JSON.parse(readFileSync(path, 'utf8'));
  expect(after.generation).toBe(before.generation + 1);
  expect(after.turn).toBeUndefined();
  expect(after.invocations).toEqual({});
  expect(after.seen).toEqual([]);
});
