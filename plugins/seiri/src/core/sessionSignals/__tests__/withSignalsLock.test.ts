import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

import { portableJoin } from '@ogham/cross-platform/compat';
import { afterAll, describe, expect, it } from 'vitest';

import { withSignalsLock } from '../store/withSignalsLock.js';

/**
 * The guard that keeps a state-free project state-free.
 *
 * `recordBashSuccess` promises that a project which never fails acquires no
 * state file at all, and locking would break that promise by creating
 * `.seiri/` just to put a lock in it. Skipping the lock when the directory
 * is absent keeps it: with no file there is nothing to race over.
 *
 * Without the guard nothing would look broken — the lock attempt fails on
 * the missing parent, the caller waits out its acquisition window, and then
 * proceeds anyway. Correct, and half a second slower on a hook that runs
 * every turn. That silence is why the timing is asserted.
 */
const createdRoots: string[] = [];

afterAll(() => {
  for (const root of createdRoots)
    rmSync(root, { recursive: true, force: true });
});

/** A repository root with `.git`, so the walk-up stops here. */
function makeRepoRoot(): string {
  const root = mkdtempSync(portableJoin(tmpdir(), 'seiri-withlock-'));
  createdRoots.push(root);
  mkdirSync(portableJoin(root, '.git'));
  return root;
}

describe('withSignalsLock', () => {
  it('runs immediately and creates nothing when there is no .seiri yet', () => {
    const root = makeRepoRoot();

    const startedAt = Date.now();
    const result = withSignalsLock(root, () => 'ran');

    expect(result).toBe('ran');
    expect(Date.now() - startedAt).toBeLessThan(200);
    expect(existsSync(portableJoin(root, '.seiri'))).toBe(false);
  });

  it('returns what the mutation returns, and releases the lock after', () => {
    const root = makeRepoRoot();
    mkdirSync(portableJoin(root, '.seiri'));

    expect(withSignalsLock(root, () => 42)).toBe(42);
    // A second call proves the first one let go.
    expect(withSignalsLock(root, () => 43)).toBe(43);
  });

  it('releases the lock when the mutation throws', () => {
    const root = makeRepoRoot();
    mkdirSync(portableJoin(root, '.seiri'));

    expect(() =>
      withSignalsLock(root, () => {
        throw new Error('boom');
      }),
    ).toThrow('boom');
    expect(withSignalsLock(root, () => 'after')).toBe('after');
  });
});
