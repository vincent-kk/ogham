/**
 * @file changelogDebt.test.ts
 * @description runChangelogDebt / detectWatchedChanges / parsePorcelainZ 유닛 테스트 — SessionEnd hook
 */
import { spawnCli } from '@ogham/cross-platform/spawn';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CHANGELOG_PENDING_MAX_CHANGES } from '../../constants/changelog.js';
import { readChangelogState } from '../../core/changelogState/operations/readChangelogState.js';
import { writeChangelogState } from '../../core/changelogState/operations/writeChangelogState.js';
import { appendErrorLogSafe } from '../../core/errorLog/operations/appendErrorLogSafe.js';
import {
  detectWatchedChanges,
  parsePorcelainZ,
  runChangelogDebt,
} from '../../hooks/sessionEnd/helpers/changelogDebt/index.js';
import { isMaencofVault } from '../../hooks/shared/isMaencofVault.js';

vi.mock('@ogham/cross-platform/spawn', () => ({
  spawnCli: vi.fn(),
}));

vi.mock('../../core/changelogState/operations/readChangelogState.js', () => ({
  readChangelogState: vi.fn(),
}));

vi.mock('../../core/changelogState/operations/writeChangelogState.js', () => ({
  writeChangelogState: vi.fn(),
}));

vi.mock('../../core/errorLog/operations/appendErrorLogSafe.js', () => ({
  appendErrorLogSafe: vi.fn(),
}));

vi.mock('../../hooks/shared/isMaencofVault.js', () => ({
  isMaencofVault: vi.fn(),
}));

const mockSpawnCli = vi.mocked(spawnCli);
const mockReadState = vi.mocked(readChangelogState);
const mockWriteState = vi.mocked(writeChangelogState);
const mockAppendErrorLogSafe = vi.mocked(appendErrorLogSafe);
const mockIsMaencofVault = vi.mocked(isMaencofVault);

const gitOk = (stdout = '') => ({
  code: 0,
  stdout,
  stderr: '',
  timedOut: false,
  spawnError: undefined,
});

describe('parsePorcelainZ', () => {
  it('수정/스테이징/미추적 엔트리를 파싱한다', () => {
    const stdout =
      ' M 01_Core/values.md\0M  02_Derived/a.md\0?? 02_Derived/새문서.md\0';
    expect(parsePorcelainZ(stdout)).toEqual([
      { status: 'M', path: '01_Core/values.md' },
      { status: 'M', path: '02_Derived/a.md' },
      { status: '??', path: '02_Derived/새문서.md' },
    ]);
  });

  it('rename 엔트리의 원본 경로 토큰을 건너뛴다', () => {
    const stdout =
      'R  01_Core/new.md\0' + '01_Core/old.md\0' + ' M CLAUDE.md\0';
    expect(parsePorcelainZ(stdout)).toEqual([
      { status: 'R', path: '01_Core/new.md' },
      { status: 'M', path: 'CLAUDE.md' },
    ]);
  });

  it('빈 출력은 빈 배열을 반환한다', () => {
    expect(parsePorcelainZ('')).toEqual([]);
  });
});

describe('detectWatchedChanges', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('changelog 디렉터리 자체의 unstaged 변경을 제외한다 (구 게이트 trim/slice 회귀)', async () => {
    mockSpawnCli.mockResolvedValue(
      gitOk(' M 02_Derived/changelog/2026-03-02.md\0 M 01_Core/values.md\0'),
    );

    const changes = await detectWatchedChanges('/vault');
    expect(changes).toEqual(['M 01_Core/values.md']);
  });

  it('git 실패(비저장소 등)면 빈 배열을 반환한다', async () => {
    mockSpawnCli.mockResolvedValue({ ...gitOk(), code: 128 });
    expect(await detectWatchedChanges('/vault')).toEqual([]);
  });
});

describe('runChangelogDebt', () => {
  const CWD = '/vault';

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsMaencofVault.mockReturnValue(true);
    mockReadState.mockReturnValue({ pending: null, lastCuratedAt: null });
    mockSpawnCli.mockResolvedValue(gitOk(''));
  });

  it('vault 가 아니면 상태를 쓰지 않는다', async () => {
    mockIsMaencofVault.mockReturnValue(false);

    const result = await runChangelogDebt({ cwd: CWD });
    expect(result).toEqual({ continue: true });
    expect(mockWriteState).not.toHaveBeenCalled();
  });

  it('변경이 있으면 pending 을 기록하고 lastCuratedAt 을 보존한다', async () => {
    mockReadState.mockReturnValue({
      pending: null,
      lastCuratedAt: '2026-07-01T00:00:00.000Z',
    });
    mockSpawnCli.mockResolvedValue(gitOk(' M 01_Core/values.md\0'));

    await runChangelogDebt({ cwd: CWD, session_id: 'sess-1' });

    expect(mockWriteState).toHaveBeenCalledOnce();
    const [, state] = mockWriteState.mock.calls[0];
    expect(state.lastCuratedAt).toBe('2026-07-01T00:00:00.000Z');
    expect(state.pending?.sessionId).toBe('sess-1');
    expect(state.pending?.changes).toEqual(['M 01_Core/values.md']);
    expect(typeof state.pending?.detectedAt).toBe('string');
  });

  it('변경이 없으면 pending 을 null 로 비운다 (stale pending 정리)', async () => {
    mockReadState.mockReturnValue({
      pending: {
        detectedAt: '2026-07-01T00:00:00.000Z',
        changes: ['M old.md'],
      },
      lastCuratedAt: null,
    });

    await runChangelogDebt({ cwd: CWD });

    const [, state] = mockWriteState.mock.calls[0];
    expect(state.pending).toBeNull();
  });

  it('변경 라인 수는 CHANGELOG_PENDING_MAX_CHANGES 로 상한한다', async () => {
    const lines = Array.from(
      { length: CHANGELOG_PENDING_MAX_CHANGES + 10 },
      (_, i) => ` M 01_Core/f${i}.md\0`,
    ).join('');
    mockSpawnCli.mockResolvedValue(gitOk(lines));

    await runChangelogDebt({ cwd: CWD });

    const [, state] = mockWriteState.mock.calls[0];
    expect(state.pending?.changes).toHaveLength(CHANGELOG_PENDING_MAX_CHANGES);
  });

  it('내부 오류는 흡수하고 { continue: true } + errorLog 를 남긴다', async () => {
    mockReadState.mockImplementation(() => {
      throw new Error('boom');
    });
    mockSpawnCli.mockResolvedValue(gitOk(' M 01_Core/values.md\0'));

    const result = await runChangelogDebt({ cwd: CWD });

    expect(result).toEqual({ continue: true });
    expect(mockAppendErrorLogSafe).toHaveBeenCalledOnce();
  });
});
