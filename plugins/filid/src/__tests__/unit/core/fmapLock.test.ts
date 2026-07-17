import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  utimesSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  acquireLock,
  releaseLock,
} from '../../../core/infra/cacheManager/caches/fmapLock.js';

// fmapLock — cross-process mutex with ownership-token fencing. A caller whose
// critical section outran the 1s stale window must not delete a sibling's
// re-acquired lock (the evict-during-hold race).

let seq = 0;
let tempDir: string;
const lockOf = (): string => join(tempDir, 'fmap.lock');
const ownerOf = (lockPath: string): string => join(lockPath, 'owner');

beforeEach(() => {
  tempDir = join(tmpdir(), `fmaplock-${process.pid}-${(seq += 1)}`);
  mkdirSync(tempDir, { recursive: true });
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe('fmapLock', () => {
  it('acquireLock returns a token and writes the owner file', () => {
    const lp = lockOf();
    const token = acquireLock(lp);
    expect(token).not.toBeNull();
    expect(readFileSync(ownerOf(lp), 'utf-8')).toBe(token);
    releaseLock(lp, token);
  });

  it('releaseLock with the owning token removes the lock', () => {
    const lp = lockOf();
    const token = acquireLock(lp);
    releaseLock(lp, token);
    expect(existsSync(lp)).toBe(false);
  });

  it('acquireLock on a fresh held lock times out and returns null', () => {
    const lp = lockOf();
    const held = acquireLock(lp);
    const second = acquireLock(lp);
    expect(held).not.toBeNull();
    expect(second).toBeNull();
    releaseLock(lp, held);
  });

  it('evict-during-hold: A must not delete B lock after a stale re-acquire', () => {
    const lp = lockOf();
    const tokenA = acquireLock(lp);
    // A's critical section outruns the 1s stale window.
    const past = new Date(Date.now() - 2000);
    utimesSync(lp, past, past);
    // Sibling B evicts A's stale lock and re-acquires with a fresh token.
    const tokenB = acquireLock(lp);
    expect(tokenB).not.toBeNull();
    expect(tokenB).not.toBe(tokenA);
    // A finishes late and releases — the token mismatch must fence it off so
    // B's live lock survives (the pre-fencing bug deleted it unconditionally).
    releaseLock(lp, tokenA);
    expect(existsSync(lp)).toBe(true);
    expect(readFileSync(ownerOf(lp), 'utf-8')).toBe(tokenB);
    releaseLock(lp, tokenB);
    expect(existsSync(lp)).toBe(false);
  });

  it('stale eviction: a lock older than 1s is evicted and re-acquired', () => {
    const lp = lockOf();
    const tokenA = acquireLock(lp);
    const past = new Date(Date.now() - 2000);
    utimesSync(lp, past, past);
    const tokenB = acquireLock(lp);
    expect(tokenB).not.toBeNull();
    expect(tokenB).not.toBe(tokenA);
    expect(readFileSync(ownerOf(lp), 'utf-8')).toBe(tokenB);
    releaseLock(lp, tokenB);
  });

  it('releaseLock(null) leaves a real owner lock untouched', () => {
    const lp = lockOf();
    const token = acquireLock(lp);
    releaseLock(lp, null);
    expect(existsSync(lp)).toBe(true);
    releaseLock(lp, token);
  });

  it('releaseLock ignores a stale token when the owner file is gone', () => {
    const lp = lockOf();
    mkdirSync(lp, { recursive: true });
    releaseLock(lp, 'ghost-token');
    expect(existsSync(lp)).toBe(true);
  });
});
