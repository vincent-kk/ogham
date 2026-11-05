/** @file sessionStore.corruption.test.ts 손상 일자 로그를 보존한 뒤 기록하는 회귀 검사. */
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { backupPathFor } from '../../backupPath/index.js';
import { getSessionDayPath } from '../operations/getSessionDayPath.js';
import { readDayLog } from '../operations/readDayLog.js';
import { recordSessionStart } from '../operations/recordSessionStart.js';

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return { ...actual, copyFileSync: vi.fn(actual.copyFileSync) };
});

describe('sessionStore corrupt day logs', () => {
  let vaultDir: string;
  let dayPath: string;
  const date = '2026-06-21';
  const now = new Date(2026, 5, 21, 10, 0);

  beforeEach(() => {
    vi.resetAllMocks();
    vaultDir = mkdtempSync(join(tmpdir(), 'maencof-session-corruption-'));
    dayPath = getSessionDayPath(vaultDir, date);
    mkdirSync(dirname(dayPath), { recursive: true });
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.useRealTimers();
    rmSync(vaultDir, { recursive: true, force: true });
  });

  it.each(['{bad json\r\n', '{"date":"2026-06-21","recoverable":42}\r\n'])(
    'backs up the exact corrupt bytes before recording a new session: %s',
    (original) => {
      writeFileSync(dayPath, original);
      expect(readDayLog(vaultDir, date)).toEqual({ date, sessions: {} });
      expect(readFileSync(dayPath, 'utf-8')).toBe(original);
      expect(readdirSync(dirname(dayPath))).toEqual([`${date}.json`]);

      recordSessionStart(vaultDir, 's1', now);

      const backups = readdirSync(dirname(dayPath)).filter((name) =>
        name.startsWith(`${date}.json.bak-`),
      );
      expect(backups).toHaveLength(1);
      expect(readFileSync(join(dirname(dayPath), backups[0]), 'utf-8')).toBe(
        original,
      );
      expect(readDayLog(vaultDir, date).sessions['s1']).toBeDefined();
    },
  );

  it('does not overwrite the corrupt original when its backup fails', () => {
    const original = '{recoverable partial data';
    writeFileSync(dayPath, original);
    vi.mocked(copyFileSync).mockImplementationOnce(() => {
      throw new Error('injected backup failure');
    });

    expect(() => recordSessionStart(vaultDir, 's1', now)).toThrow(
      'injected backup failure',
    );
    expect(readFileSync(dayPath, 'utf-8')).toBe(original);
  });

  it('keeps valid sessions without making a corruption backup', () => {
    recordSessionStart(vaultDir, 's1', now);
    recordSessionStart(vaultDir, 's2', now);

    expect(Object.keys(readDayLog(vaultDir, date).sessions)).toEqual([
      's1',
      's2',
    ]);
    expect(readdirSync(dirname(dayPath))).toEqual([`${date}.json`]);
    expect(copyFileSync).not.toHaveBeenCalled();
  });

  it('preserves both corrupt files when the backup timestamp collides', () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const backupPath = backupPathFor(dayPath);
    writeFileSync(backupPath, '{earlier recoverable data');
    writeFileSync(dayPath, '{current recoverable data');

    expect(() => recordSessionStart(vaultDir, 's1', now)).toThrow();
    expect(readFileSync(dayPath, 'utf-8')).toBe('{current recoverable data');
    expect(readFileSync(backupPath, 'utf-8')).toBe('{earlier recoverable data');
  });
});
