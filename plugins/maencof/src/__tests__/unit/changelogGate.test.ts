/**
 * @file changelogGate.test.ts
 * @description runChangelogGate 유닛 테스트 — Stop hook
 */
import { existsSync, readFileSync, unlinkSync } from 'node:fs';

import { spawnCli } from '@ogham/cross-platform/spawn';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { isMaencofVault } from '../../hooks/shared/isMaencofVault.js';
import { metaPath } from '../../hooks/shared/metaPath.js';
import { runChangelogGate } from '../../hooks/stop/helpers/changelogGate/changelogGate.js';

// ─── Mock 설정 ────────────────────────────────────────────────────────────────

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  unlinkSync: vi.fn(),
}));

vi.mock('@ogham/cross-platform/spawn', () => ({
  spawnCli: vi.fn(),
}));

vi.mock('../../hooks/shared/isMaencofVault.js', () => ({
  isMaencofVault: vi.fn(),
}));

vi.mock('../../hooks/shared/metaPath.js', () => ({
  metaPath: vi.fn(),
}));

const mockExistsSync = vi.mocked(existsSync);
const mockReadFileSync = vi.mocked(readFileSync);
const mockUnlinkSync = vi.mocked(unlinkSync);
const mockSpawnCli = vi.mocked(spawnCli);
const mockIsMaencofVault = vi.mocked(isMaencofVault);
const mockMetaPath = vi.mocked(metaPath);

const gitOk = (stdout = '') => ({
  code: 0,
  stdout,
  stderr: '',
  timedOut: false,
  spawnError: undefined,
});

// ─── 테스트 ───────────────────────────────────────────────────────────────────

describe('runChangelogGate', () => {
  const CWD = '/vault';
  const LOCK_PATH = '/vault/.maencof-meta/migration.lock';
  const SESSION_ID = 'session-abc';

  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(false);
    mockIsMaencofVault.mockReturnValue(true);
    mockMetaPath.mockImplementation((_cwd, ...segments) =>
      [_cwd, '.maencof-meta', ...segments].join('/'),
    );
    // git status 변경 없음 (default)
    mockSpawnCli.mockResolvedValue(gitOk(''));
    mockUnlinkSync.mockImplementation(() => undefined);
  });

  it('migration.lock 존재 + TTL 유효 + sessionId 일치 → { continue: true }', async () => {
    mockExistsSync.mockImplementation((p) => p === LOCK_PATH);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        startedAt: new Date(Date.now() - 60_000).toISOString(),
        ttlMinutes: 30,
        sessionId: SESSION_ID,
      }),
    );

    const result = await runChangelogGate({ cwd: CWD, session_id: SESSION_ID });

    expect(result).toEqual({ continue: true });
  });

  it('migration.lock 존재하지만 TTL 만료 → orphan cleanup 수행 후 일반 게이트 진행', async () => {
    mockExistsSync.mockImplementation((p) => p === LOCK_PATH);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        ttlMinutes: 30,
        sessionId: SESSION_ID,
      }),
    );

    // (a) 변경 없음 → 통과 + orphan lock 제거
    mockSpawnCli.mockResolvedValue(gitOk(''));
    const resultNoChange = await runChangelogGate({
      cwd: CWD,
      session_id: SESSION_ID,
    });
    expect(resultNoChange).toEqual({ continue: true });
    expect(mockUnlinkSync).toHaveBeenCalledWith(LOCK_PATH);

    // (b) 변경 있음 → 차단 + orphan lock 제거
    mockUnlinkSync.mockClear();
    mockSpawnCli.mockResolvedValue(gitOk('M  01_Core/identity.md'));
    const resultChange = await runChangelogGate({
      cwd: CWD,
      session_id: SESSION_ID,
    });
    expect(resultChange.continue).toBe(false);
    expect(resultChange.reason).toBeDefined();
    expect(mockUnlinkSync).toHaveBeenCalledWith(LOCK_PATH);
  });

  it('migration.lock sessionId 불일치 → orphan cleanup 후 일반 게이트 진행', async () => {
    mockExistsSync.mockImplementation((p) => p === LOCK_PATH);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        startedAt: new Date(Date.now() - 60_000).toISOString(),
        ttlMinutes: 30,
        sessionId: 'other-session-xyz',
      }),
    );
    mockSpawnCli.mockResolvedValue(gitOk(''));

    const result = await runChangelogGate({ cwd: CWD, session_id: SESSION_ID });

    expect(result).toEqual({ continue: true });
    expect(mockUnlinkSync).toHaveBeenCalledWith(LOCK_PATH);
  });

  it('유효한 lock (TTL+session 일치) 은 절대 unlink 되지 않는다', async () => {
    mockExistsSync.mockImplementation((p) => p === LOCK_PATH);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        startedAt: new Date(Date.now() - 60_000).toISOString(),
        ttlMinutes: 30,
        sessionId: SESSION_ID,
      }),
    );

    await runChangelogGate({ cwd: CWD, session_id: SESSION_ID });

    expect(mockUnlinkSync).not.toHaveBeenCalled();
  });

  it('orphan cleanup 의 unlink 실패는 치명적이지 않다 (graceful degradation)', async () => {
    mockExistsSync.mockImplementation((p) => p === LOCK_PATH);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        ttlMinutes: 30,
        sessionId: SESSION_ID,
      }),
    );
    mockUnlinkSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });
    mockSpawnCli.mockResolvedValue(gitOk(''));

    const result = await runChangelogGate({ cwd: CWD, session_id: SESSION_ID });

    expect(result).toEqual({ continue: true });
  });

  it('migration.lock JSON parse 실패 → { continue: true } (graceful degradation)', async () => {
    mockExistsSync.mockImplementation((p) => p === LOCK_PATH);
    mockReadFileSync.mockReturnValue('NOT_VALID_JSON{{{');

    mockSpawnCli.mockResolvedValue(gitOk(''));
    const result = await runChangelogGate({ cwd: CWD, session_id: SESSION_ID });

    expect(result).toEqual({ continue: true });
  });

  it('migration.lock 없음 + 감시 경로 변경 없음 → { continue: true }', async () => {
    mockExistsSync.mockReturnValue(false);
    mockSpawnCli.mockResolvedValue(gitOk(''));

    const result = await runChangelogGate({ cwd: CWD });

    expect(result).toEqual({ continue: true });
  });
});
