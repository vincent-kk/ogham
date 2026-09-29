import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

import { portableJoin } from '@ogham/cross-platform';
import { afterEach, expect, it } from 'vitest';

import type { WorkflowIdentity } from '../../../types/workflow.js';
import { observeEdit } from '../workflow/observeEdit.js';

import { seedActor } from './helpers/seedActor.js';

/** Repositories removed after their case finishes. */
const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

/**
 * Build a main-actor identity in a fresh repository with no actor state.
 * @param turn Turn hash to carry; omitted for none.
 * @returns The identity.
 */
function identityIn(turn?: string): WorkflowIdentity {
  const root = mkdtempSync(portableJoin(tmpdir(), 'seiri-observe-edit-'));
  roots.push(root);
  mkdirSync(portableJoin(root, '.git'));
  return { root, actor: 'actor-a', ...(turn ? { turn } : {}) };
}

it('seeds the actor and reports first, then spread at the threshold, each once', () => {
  const identity = identityIn('turn-a');
  expect(observeEdit(identity, 'a', 1, 3)).toEqual({
    kind: 'first',
    fileCount: 1,
  });
  expect(observeEdit(identity, 'a', 2, 3)).toBeUndefined();
  expect(observeEdit(identity, 'b', 3, 3)).toBeUndefined();
  expect(observeEdit(identity, 'c', 4, 3)).toEqual({
    kind: 'spread',
    fileCount: 3,
  });
  expect(observeEdit(identity, 'd', 5, 3)).toBeUndefined();
});

it('does nothing without a turn', () => {
  const identity = identityIn();
  expect(observeEdit(identity, 'a', 1, 3)).toBeUndefined();
  expect(existsSync(portableJoin(identity.root, '.seiri', 'sessions'))).toBe(
    false,
  );
});

it('does not record an edit whose turn differs from the anchor', () => {
  const identity = identityIn('turn-a');
  seedActor(identity, 1);
  expect(
    observeEdit({ ...identity, turn: 'turn-b' }, 'a', 2, 3),
  ).toBeUndefined();
  expect(observeEdit(identity, 'a', 3, 3)).toEqual({
    kind: 'first',
    fileCount: 1,
  });
});
