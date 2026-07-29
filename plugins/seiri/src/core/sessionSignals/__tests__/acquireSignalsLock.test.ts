import { mkdirSync, mkdtempSync, rmSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';

import { portableJoin } from '@ogham/cross-platform/compat';
import { afterAll, describe, expect, it } from 'vitest';

import { acquireSignalsLock } from '../utils/acquireSignalsLock.js';

/**
 * The lock's two failure modes, neither of which any other check notices.
 *
 * A lock that waits forever would freeze a hook, and hooks run on every
 * turn — so a lock held by someone else has to be abandoned rather than
 * waited on. A lock never reclaimed freezes every later hook instead: a
 * holder killed mid-write releases nothing, and without the stale sweep
 * that directory would outlive the session.
 *
 * Both are silent when broken. The signals race check would still pass,
 * because it never contends: it would simply serialise behind a lock that
 * always yields, or stall behind one that never does.
 */
const STALE_AFTER_MS = 5_000;

const createdRoots: string[] = [];

afterAll(() => {
  for (const root of createdRoots)
    rmSync(root, { recursive: true, force: true });
});

/** A throwaway directory to hold lock paths. */
function makeDir(): string {
  const dir = mkdtempSync(portableJoin(tmpdir(), 'seiri-lock-'));
  createdRoots.push(dir);
  return dir;
}

describe('acquireSignalsLock', () => {
  it('takes a lock nobody holds', () => {
    const lockPath = portableJoin(makeDir(), 'signals.lock');
    expect(acquireSignalsLock(lockPath)).toBe(true);
  });

  it('gives up on a held lock instead of waiting on it', () => {
    const lockPath = portableJoin(makeDir(), 'signals.lock');
    mkdirSync(lockPath);

    const startedAt = Date.now();
    const taken = acquireSignalsLock(lockPath);

    expect(taken).toBe(false);
    // Bounded: the caller proceeds unserialised rather than stalling a turn.
    expect(Date.now() - startedAt).toBeLessThan(STALE_AFTER_MS);
  });

  it('reclaims a lock whose holder never released it', () => {
    const lockPath = portableJoin(makeDir(), 'signals.lock');
    mkdirSync(lockPath);
    const longAgo = new Date(Date.now() - STALE_AFTER_MS * 2);
    utimesSync(lockPath, longAgo, longAgo);

    expect(acquireSignalsLock(lockPath)).toBe(true);
  });
});
