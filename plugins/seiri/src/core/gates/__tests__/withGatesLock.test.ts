import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

import { portableJoin } from '@ogham/cross-platform';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GATES_LOCK_DIR } from '../../../constants/files.js';
import { withGatesLock } from '../store/withGatesLock.js';

/** Temporary task directories removed after each test. */
const createdRoots: string[] = [];

afterEach(() => {
  for (const root of createdRoots) rmSync(root, { recursive: true, force: true });
  createdRoots.length = 0;
});

/**
 * Create a task directory whose lock directory is already held, so
 * `acquireLockDir` cannot take it within its timeout.
 *
 * @returns The task directory path.
 */
function makeHeldTaskDir(): string {
  const taskDir = mkdtempSync(portableJoin(tmpdir(), 'seiri-gates-lock-'));
  createdRoots.push(taskDir);
  mkdirSync(portableJoin(taskDir, GATES_LOCK_DIR));
  return taskDir;
}

describe('withGatesLock', () => {
  it('throws and skips the callback when requireLock is true and the lock is unavailable', () => {
    const taskDir = makeHeldTaskDir();
    const mutate = vi.fn(() => 'result');

    expect(() => withGatesLock(taskDir, mutate, true)).toThrow();
    expect(mutate).not.toHaveBeenCalled();
  }, 10_000);

  it('still calls the callback and returns its result when requireLock is false', () => {
    const taskDir = makeHeldTaskDir();
    const mutate = vi.fn(() => 'result');

    expect(withGatesLock(taskDir, mutate, false)).toBe('result');
    expect(mutate).toHaveBeenCalledTimes(1);
  }, 10_000);

  it('still calls the callback under the two-argument form', () => {
    const taskDir = makeHeldTaskDir();
    const mutate = vi.fn(() => 'result');

    expect(withGatesLock(taskDir, mutate)).toBe('result');
    expect(mutate).toHaveBeenCalledTimes(1);
  }, 10_000);
});
