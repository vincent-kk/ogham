import {
  lstatSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  utimesSync,
} from 'node:fs';
import { tmpdir } from 'node:os';

import { portableJoin } from '@ogham/cross-platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { newestMtime } from '../store/sweepStaleTasks/utils/newestMtime.js';

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return { ...actual, readdirSync: vi.fn(actual.readdirSync) };
});

describe('newestMtime directory read failures', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(portableJoin(tmpdir(), 'seiri-newest-mtime-'));
    utimesSync(dir, new Date(0), new Date(0));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(dir, { recursive: true, force: true });
  });

  it('retains the directory mtime when it disappears before listing', () => {
    const mtime = lstatSync(dir).mtimeMs;
    vi.mocked(readdirSync).mockImplementationOnce(() => {
      throw Object.assign(new Error('directory vanished'), {
        code: 'ENOENT',
      });
    });
    expect(newestMtime(dir)).toBe(mtime);
  });

  it('propagates directory permission errors', () => {
    const error = Object.assign(new Error('permission denied'), {
      code: 'EACCES',
    });
    vi.mocked(readdirSync).mockImplementationOnce(() => {
      throw error;
    });
    expect(() => newestMtime(dir)).toThrow(error);
  });
});
