import {
  existsSync,
  lutimesSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as locks from '../../utils/acquireLockDir.js';
import { sweepStaleActors } from '../index.js';
import { sweepActorGroup } from '../workflow/sweepStaleActors/utils/sweepActorGroup.js';

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    readdirSync: vi.fn(actual.readdirSync),
    rmSync: vi.fn(actual.rmSync),
  };
});

describe('actor sweep races and failures', () => {
  let root: string;
  let dir: string;

  /** Create a stale actor member for an interleaving probe.
   * @param name Basename within the sessions directory.
   * @returns Absolute path with epoch mtime.
   */
  function member(name: string): string {
    const path = join(dir, name);
    writeFileSync(path, 'state');
    utimesSync(path, new Date(0), new Date(0));
    return path;
  }

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'seiri-actor-races-'));
    dir = join(root, '.seiri/sessions');
    mkdirSync(dir, { recursive: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(root, { recursive: true, force: true });
  });

  it('ignores a member that disappears after the directory scan', async () => {
    const path = member('a.json');
    const marker = member('a.json.revoked');
    const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
    vi.mocked(readdirSync).mockImplementationOnce((...args) => {
      const names = actual.readdirSync(...args);
      rmSync(marker);
      return names;
    });
    sweepStaleActors(root, 1_700_000_000_000);
    expect(existsSync(path)).toBe(false);
  });

  it('continues after one group cannot acquire its lock', () => {
    const first = member('a.json');
    const second = member('b.json');
    const acquire = locks.acquireLockDir;
    vi.spyOn(locks, 'acquireLockDir').mockImplementation((lock) => {
      if (lock.endsWith('a.json.lock')) throw new Error('unavailable');
      return acquire(lock);
    });
    expect(() => sweepStaleActors(root, 1_700_000_000_000)).not.toThrow();
    expect([first, second].map(existsSync)).toEqual([true, false]);
  });

  it('removes the state before markers and temporary files', () => {
    const marker = member('a.json.revoked');
    const temporary = member('a.json.tmp');
    const state = member('a.json');
    vi.mocked(rmSync).mockClear();
    sweepActorGroup(
      dir,
      'a.json',
      ['a.json.revoked', 'a.json.tmp', 'a.json'],
      1_700_000_000_000,
    );
    expect(vi.mocked(rmSync).mock.calls.map(([path]) => path)).toEqual([
      state,
      marker,
      temporary,
    ]);
  });

  it('preserves quarantine markers when state removal fails', async () => {
    const marker = member('a.json.revoked');
    const state = member('a.json');
    const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
    vi.mocked(rmSync).mockImplementation((path, options) => {
      if (path === state) throw new Error('unlink failed');
      actual.rmSync(path, options);
    });
    expect(() =>
      sweepActorGroup(
        dir,
        'a.json',
        ['a.json.revoked', 'a.json'],
        1_700_000_000_000,
      ),
    ).toThrow('unlink failed');
    expect([state, marker].map(existsSync)).toEqual([true, true]);
    expect(existsSync(join(dir, 'a.json.lock'))).toBe(false);
  });

  it('removes an old actor symlink without changing its external target', () => {
    const outside = join(root, 'outside');
    writeFileSync(outside, 'fresh target');
    const link = join(dir, 'a.json');
    symlinkSync(outside, link);
    lutimesSync(link, new Date(0), new Date(0));
    sweepStaleActors(root, 1_700_000_000_000);
    expect(existsSync(link)).toBe(false);
    expect(existsSync(outside)).toBe(true);
  });
});
