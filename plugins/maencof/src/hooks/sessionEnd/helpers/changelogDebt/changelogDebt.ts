/**
 * @file changelogDebt.ts
 * @description SessionEnd — 감시 경로의 미기록 변경을 세션당 1회 스캔해
 * `.maencof-meta/changelog-state.json` 의 pending 에 기록한다.
 *
 * 감지는 세션 경계 1회, 강제는 차단이 아니라 다음 SessionStart 의 1줄 권고 —
 * 매 턴 git spawn 과 세션 종료 차단을 피하는 배치다. 변경 자체는 git 이
 * 보존하므로 스캔 누락(크래시로 SessionEnd 미발화 등)은 다음 정상 종료
 * 세션에서 자가 치유된다.
 *
 * graceful degradation: 모든 에러 catch → { continue: true }
 */
import { spawnCli } from '@ogham/cross-platform/spawn';

import {
  CHANGELOG_EXCLUDE,
  CHANGELOG_PENDING_MAX_CHANGES,
  WATCHED_PATHS,
} from '../../../../constants/changelog.js';
import { EXEC_TIMEOUT_MS } from '../../../../constants/performance.js';
import {
  readChangelogState,
  writeChangelogState,
} from '../../../../core/changelogState/changelogState.js';
import { appendErrorLogSafe } from '../../../../core/errorLog/errorLog.js';
import { isMaencofVault } from '../../../shared/isMaencofVault.js';

export interface ChangelogDebtInput {
  session_id?: string;
  cwd?: string;
}

export interface ChangelogDebtResult {
  continue: boolean;
}

export interface PorcelainEntry {
  /** XY 상태 코드 (공백 trim 후, 예: 'M', '??', 'R') */
  status: string;
  path: string;
}

/**
 * `git status --porcelain -z` 출력 파싱. NUL 구분이라 비ASCII/특수문자 경로가
 * 인용되지 않는다(Windows/POSIX 동일). 각 토큰은 `XY<space>PATH`; rename/copy
 * (X 가 R/C)는 다음 토큰이 원본 경로이므로 건너뛴다.
 */
export function parsePorcelainZ(stdout: string): PorcelainEntry[] {
  const tokens = stdout.split('\0');
  const entries: PorcelainEntry[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (!token || token.length < 4) continue;
    const status = token.slice(0, 2);
    entries.push({ status: status.trim(), path: token.slice(3) });
    if (status.startsWith('R') || status.startsWith('C')) i += 1;
  }
  return entries;
}

/** 감시 경로의 미기록 변경 조회. changelog 디렉터리 자체는 제외. */
export async function detectWatchedChanges(cwd: string): Promise<string[]> {
  const result = await spawnCli(
    'git',
    ['status', '--porcelain', '-z', '--', ...WATCHED_PATHS],
    { cwd, timeoutMs: EXEC_TIMEOUT_MS },
  );
  if (result.code !== 0 || result.spawnError) return [];
  return parsePorcelainZ(result.stdout)
    .filter((entry) => !entry.path.startsWith(CHANGELOG_EXCLUDE))
    .map((entry) => `${entry.status} ${entry.path}`);
}

/**
 * Changelog debt SessionEnd concern.
 * vaultCommitter 이전에 실행되어 상태 파일이 opt-in 자동 커밋에 포함된다.
 */
export async function runChangelogDebt(
  input: ChangelogDebtInput,
): Promise<ChangelogDebtResult> {
  try {
    const cwd = input.cwd ?? process.cwd();
    if (!isMaencofVault(cwd)) return { continue: true };

    const changes = await detectWatchedChanges(cwd);
    const state = readChangelogState(cwd);
    writeChangelogState(cwd, {
      ...state,
      pending:
        changes.length > 0
          ? {
              detectedAt: new Date().toISOString(),
              ...(input.session_id ? { sessionId: input.session_id } : {}),
              changes: changes.slice(0, CHANGELOG_PENDING_MAX_CHANGES),
            }
          : null,
    });
  } catch (e) {
    appendErrorLogSafe(input.cwd ?? process.cwd(), {
      hook: 'changelog-debt',
      error: String(e),
      timestamp: new Date().toISOString(),
    });
  }
  return { continue: true };
}
