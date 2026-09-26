import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { IDLE_STATE_TTL } from '../../../constants/retention.js';
import * as locks from '../../utils/acquireLockDir.js';
import { sweepStaleActors } from '../index.js';

/** Fixed wall time keeps the TTL boundary independent of execution speed. */
const NOW = 1_700_000_000_000;

describe('sweepStaleActors', () => {
  let root: string;
  let dir: string;

  /** Create a member with an exact age for group eligibility checks.
   * @param name Session member basename.
   * @param age Milliseconds since its last modification.
   * @returns Absolute member path.
   */
  function member(name: string, age = IDLE_STATE_TTL + 1): string {
    const path = join(dir, name);
    writeFileSync(path, 'state');
    utimesSync(path, new Date(NOW - age), new Date(NOW - age));
    return path;
  }

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'seiri-actors-'));
    dir = join(root, '.seiri/sessions');
    mkdirSync(dir, { recursive: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(root, { recursive: true, force: true });
  });

  it('removes a stale actor together with markers and atomic-write residue', () => {
    const paths = [
      'a.json',
      'a.json.revoked',
      'a.json.revoked-suspend',
      'a.json.123.abcdef123456.tmp',
    ].map((name) => member(name));
    sweepStaleActors(root, NOW);
    expect(paths.map(existsSync)).toEqual([false, false, false, false]);
    expect(existsSync(join(dir, 'a.json.lock'))).toBe(false);
  });

  it('retains a fresh actor', () => {
    const path = member('a.json', 0);
    sweepStaleActors(root, NOW);
    expect(existsSync(path)).toBe(true);
  });

  it('retains the whole group when a marker is fresh', () => {
    const paths = [member('a.json'), member('a.json.revoked', 0)];
    sweepStaleActors(root, NOW);
    expect(paths.map(existsSync)).toEqual([true, true]);
  });

  it('reclaims an abandoned lock and releases it after deleting the actor', () => {
    const path = member('a.json');
    const lock = join(dir, 'a.json.lock');
    mkdirSync(lock);
    utimesSync(
      lock,
      new Date(NOW - IDLE_STATE_TTL - 1),
      new Date(NOW - IDLE_STATE_TTL - 1),
    );
    sweepStaleActors(root, NOW);
    expect([path, lock].map(existsSync)).toEqual([false, false]);
  });

  it('skips a fresh lock without attempting acquisition', () => {
    const path = member('a.json');
    mkdirSync(join(dir, 'a.json.lock'));
    const acquire = vi.spyOn(locks, 'acquireLockDir');
    sweepStaleActors(root, NOW);
    expect(existsSync(path)).toBe(true);
    expect(acquire).not.toHaveBeenCalled();
  });

  it('retains an actor exactly at the TTL boundary', () => {
    const path = member('a.json', IDLE_STATE_TTL);
    sweepStaleActors(root, NOW);
    expect(existsSync(path)).toBe(true);
  });

  it('handles unrelated names individually', () => {
    const paths = [member('orphan'), member('fresh', 0)];
    sweepStaleActors(root, NOW);
    expect(paths.map(existsSync)).toEqual([false, true]);
  });

  it('accepts a missing sessions directory', () => {
    rmSync(dir, { recursive: true });
    expect(() => sweepStaleActors(root, NOW)).not.toThrow();
    expect(existsSync(dir)).toBe(false);
  });

  it('leaves configuration and runtime state outside sessions untouched', () => {
    const paths = [
      join(root, '.seiri/config.json'),
      join(root, '.seiri/runtime.json'),
    ];
    for (const path of paths) {
      writeFileSync(path, '{}');
      utimesSync(path, new Date(0), new Date(0));
    }
    member('a.json');
    sweepStaleActors(root, NOW);
    expect(paths.map(existsSync)).toEqual([true, true]);
  });

  it('does not follow a sessions directory symlink', () => {
    rmSync(dir, { recursive: true });
    const outside = join(root, 'outside');
    mkdirSync(outside);
    writeFileSync(join(outside, 'a.json'), '{}');
    utimesSync(join(outside, 'a.json'), new Date(0), new Date(0));
    symlinkSync(outside, dir, 'dir');
    sweepStaleActors(root, NOW);
    expect(existsSync(join(outside, 'a.json'))).toBe(true);
  });

  it('retains actors when the lock cannot be acquired', () => {
    const path = member('a.json');
    vi.spyOn(locks, 'acquireLockDir').mockReturnValue(false);
    sweepStaleActors(root, NOW);
    expect(existsSync(path)).toBe(true);
  });

  it('rechecks mtime under the lock and releases it when a member changed', () => {
    const path = member('a.json');
    vi.spyOn(locks, 'acquireLockDir').mockImplementation((lock) => {
      mkdirSync(lock);
      utimesSync(path, new Date(NOW), new Date(NOW));
      return true;
    });
    sweepStaleActors(root, NOW);
    expect(existsSync(path)).toBe(true);
    expect(existsSync(`${path}.lock`)).toBe(false);
  });

  it('ignores a member that disappears before the locked recheck', () => {
    const path = member('a.json');
    const marker = member('a.json.revoked');
    vi.spyOn(locks, 'acquireLockDir').mockImplementation((lock) => {
      mkdirSync(lock);
      rmSync(marker);
      return true;
    });
    sweepStaleActors(root, NOW);
    expect([path, marker, `${path}.lock`].map(existsSync)).toEqual([
      false,
      false,
      false,
    ]);
  });
});
