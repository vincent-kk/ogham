/**
 * @file changelog-gate.test.ts
 * @description runChangelogGate 유닛 테스트 — Stop hook
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { runChangelogGate } from '../../hooks/changelog-gate/changelog-gate.js';
import { isMaencofVault, metaPath } from '../../hooks/shared/shared.js';

// ─── Mock 설정 ────────────────────────────────────────────────────────────────

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  unlinkSync: vi.fn(),
}));

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

vi.mock('../../hooks/shared/shared.js', () => ({
  isMaencofVault: vi.fn(),
  metaPath: vi.fn(),
}));

const mockExistsSync = vi.mocked(existsSync);
const mockReadFileSync = vi.mocked(readFileSync);
const mockUnlinkSync = vi.mocked(unlinkSync);
const mockExecSync = vi.mocked(execSync);
const mockIsMaencofVault = vi.mocked(isMaencofVault);
const mockMetaPath = vi.mocked(metaPath);

// ─── 테스트 ───────────────────────────────────────────────────────────────────

describe('runChangelogGate', () => {
  const CWD = '/vault';
  const LOCK_PATH = '/vault/.maencof-meta/migration.lock';
  const SESSION_ID = 'session-abc';

  beforeEach(() => {
    vi.clearAllMocks();
    // 기본값: 마커 없음, vault, lockPath 계산
    mockExistsSync.mockReturnValue(false);
    mockIsMaencofVault.mockReturnValue(true);
    mockMetaPath.mockImplementation((_cwd, ...segments) =>
      [_cwd, '.maencof-meta', ...segments].join('/'),
    );
    // git 변경 없음
    mockExecSync.mockReturnValue(Buffer.from(''));
    // unlinkSync 기본값: no-op
    mockUnlinkSync.mockImplementation(() => undefined);
  });

  it('migration.lock 존재 + TTL 유효 + sessionId 일치 → { continue: true }', () => {
    // 마커 파일 없음 → false, lockPath 존재 → true
    mockExistsSync.mockImplementation((p) => p === LOCK_PATH);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        startedAt: new Date(Date.now() - 60_000).toISOString(), // 1분 전
        ttlMinutes: 30,
        sessionId: SESSION_ID,
      }),
    );

    const result = runChangelogGate({ cwd: CWD, session_id: SESSION_ID });

    expect(result).toEqual({ continue: true });
  });

  it('migration.lock 존재하지만 TTL 만료 → orphan cleanup 수행 후 일반 게이트 진행', () => {
    mockExistsSync.mockImplementation((p) => p === LOCK_PATH);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2시간 전
        ttlMinutes: 30,
        sessionId: SESSION_ID,
      }),
    );

    // (a) 변경 없음 → 통과 + orphan lock 제거
    mockExecSync.mockReturnValue(Buffer.from(''));
    const resultNoChange = runChangelogGate({
      cwd: CWD,
      session_id: SESSION_ID,
    });
    expect(resultNoChange).toEqual({ continue: true });
    expect(mockUnlinkSync).toHaveBeenCalledWith(LOCK_PATH);

    // (b) 변경 있음 → 차단 + orphan lock 제거
    mockUnlinkSync.mockClear();
    mockExecSync.mockReturnValue(Buffer.from('M  01_Core/identity.md'));
    const resultChange = runChangelogGate({ cwd: CWD, session_id: SESSION_ID });
    expect(resultChange.continue).toBe(false);
    expect(resultChange.reason).toBeDefined();
    expect(mockUnlinkSync).toHaveBeenCalledWith(LOCK_PATH);
  });

  it('migration.lock sessionId 불일치 → orphan cleanup 후 일반 게이트 진행', () => {
    mockExistsSync.mockImplementation((p) => p === LOCK_PATH);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        startedAt: new Date(Date.now() - 60_000).toISOString(), // 1분 전 (TTL 유효)
        ttlMinutes: 30,
        sessionId: 'other-session-xyz',
      }),
    );
    mockExecSync.mockReturnValue(Buffer.from(''));

    const result = runChangelogGate({ cwd: CWD, session_id: SESSION_ID });

    expect(result).toEqual({ continue: true });
    expect(mockUnlinkSync).toHaveBeenCalledWith(LOCK_PATH);
  });

  it('유효한 lock (TTL+session 일치) 은 절대 unlink 되지 않는다', () => {
    mockExistsSync.mockImplementation((p) => p === LOCK_PATH);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        startedAt: new Date(Date.now() - 60_000).toISOString(),
        ttlMinutes: 30,
        sessionId: SESSION_ID,
      }),
    );

    runChangelogGate({ cwd: CWD, session_id: SESSION_ID });

    expect(mockUnlinkSync).not.toHaveBeenCalled();
  });

  it('orphan cleanup 의 unlink 실패는 치명적이지 않다 (graceful degradation)', () => {
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
    mockExecSync.mockReturnValue(Buffer.from(''));

    const result = runChangelogGate({ cwd: CWD, session_id: SESSION_ID });

    expect(result).toEqual({ continue: true });
  });

  it('migration.lock JSON parse 실패 → { continue: true } (graceful degradation)', () => {
    mockExistsSync.mockImplementation((p) => p === LOCK_PATH);
    mockReadFileSync.mockReturnValue('NOT_VALID_JSON{{{');

    // git 변경 없음 → 파싱 실패 후 정상 gate 통과
    mockExecSync.mockReturnValue(Buffer.from(''));
    const result = runChangelogGate({ cwd: CWD, session_id: SESSION_ID });

    expect(result).toEqual({ continue: true });
  });

  it('migration.lock 없음 + 감시 경로 변경 없음 → { continue: true }', () => {
    // 마커도 없고 lockPath도 없음
    mockExistsSync.mockReturnValue(false);
    mockExecSync.mockReturnValue(Buffer.from(''));

    const result = runChangelogGate({ cwd: CWD });

    expect(result).toEqual({ continue: true });
  });
});
