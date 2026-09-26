import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

import { portableJoin } from '@ogham/cross-platform';
import { afterEach, expect, it, vi } from 'vitest';

import type { WorkflowIdentity } from '../../../types/workflow.js';

const { writeAtomicallyMock } = vi.hoisted(() => ({
  writeAtomicallyMock: vi.fn(),
}));

vi.mock('../../utils/writeAtomically.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../utils/writeAtomically.js')>();
  writeAtomicallyMock.mockImplementation(actual.writeAtomically);
  return { writeAtomically: writeAtomicallyMock };
});

const { observeBoundary } = await import('../workflow/observeBoundary.js');

const NOW = 1_700_000_000_000;
const roots: string[] = [];
afterEach(() =>
  roots
    .splice(0)
    .forEach((root) => rmSync(root, { recursive: true, force: true })),
);

it('never deletes the quarantine marker ahead of a successful commit — it survives even a storage failure that also blocks its own re-write', () => {
  const root = mkdtempSync(portableJoin(tmpdir(), 'seiri-quarantine-storage-'));
  roots.push(root);
  mkdirSync(portableJoin(root, '.git'));
  const id: WorkflowIdentity = { root, actor: 'actor', turn: 'turn' };
  const path = portableJoin(root, '.seiri/sessions/actor.json');

  observeBoundary(id, true, NOW);
  mkdirSync(`${path}.lock`);
  observeBoundary({ ...id, turn: 'next' }, true, NOW);
  rmSync(`${path}.lock`, { recursive: true });
  expect(existsSync(`${path}.revoked`)).toBe(true);

  // Total storage failure: the state write throws, and so does any
  // attempt to re-write the marker in the catch branch — so the only way
  // the marker can still exist afterward is if it was never deleted.
  writeAtomicallyMock.mockImplementation(() => {
    throw new Error('storage unavailable');
  });

  const snapshot = observeBoundary({ ...id, turn: 'recovered' }, true, NOW);

  expect(snapshot).toBeUndefined();
  expect(existsSync(`${path}.revoked`)).toBe(true);
});
