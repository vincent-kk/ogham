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

import { observeBoundary } from '../workflow/observeBoundary.js';
import { prepareDirectory } from '../workflow/prepareDirectory.js';
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
it('revokes subsequent automatic effects when a boundary cannot acquire its lock', () => {
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
