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

import type { WorkflowIdentity } from '../../../types/workflow.js';
import { isFirstChildTurn } from '../workflow/isFirstChildTurn.js';
import { observeBoundary } from '../workflow/observeBoundary.js';

const NOW = 1_700_000_000_000;
const roots: string[] = [];
function fixture(): { id: WorkflowIdentity; path: string } {
  const root = mkdtempSync(portableJoin(tmpdir(), 'seiri-first-child-'));
  roots.push(root);
  mkdirSync(portableJoin(root, '.git'));
  const id: WorkflowIdentity = { root, actor: 'child-a', turn: 'turn-a' };
  return { id, path: portableJoin(root, '.seiri/sessions/child-a.json') };
}
afterEach(() =>
  roots
    .splice(0)
    .forEach((root) => rmSync(root, { recursive: true, force: true })),
);

it('is first when no state file exists yet', () => {
  const { id } = fixture();
  expect(isFirstChildTurn(id, NOW)).toBe(true);
});

it('is not first once a boundary already advanced the generation', () => {
  const { id } = fixture();
  observeBoundary(id, true, NOW, { firstChild: true });
  expect(isFirstChildTurn(id, NOW)).toBe(false);
});

it('is first once the actor TTL has expired, even at a later generation', () => {
  const { id, path } = fixture();
  observeBoundary(id, true, NOW, { firstChild: true });
  const stale = JSON.parse(readFileSync(path, 'utf8'));
  expect(stale.generation).toBeGreaterThan(0);
  stale.lastObservedAt -= 8 * 24 * 60 * 60 * 1000;
  writeFileSync(path, JSON.stringify(stale));
  expect(isFirstChildTurn(id, NOW)).toBe(true);
});

it('is first for a fresh state file whose stored generation is still 0', () => {
  const { id, path } = fixture();
  observeBoundary(id, true, NOW, { firstChild: true });
  const unadvanced = JSON.parse(readFileSync(path, 'utf8'));
  unadvanced.generation = 0;
  writeFileSync(path, JSON.stringify(unadvanced));
  expect(isFirstChildTurn(id, NOW)).toBe(true);
});

it('is first for corrupt JSON', () => {
  const { id, path } = fixture();
  mkdirSync(portableJoin(id.root, '.seiri/sessions'), { recursive: true });
  writeFileSync(path, '{ not json');
  expect(isFirstChildTurn(id, NOW)).toBe(true);
});
