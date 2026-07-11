/**
 * @file runChangelogDebt.ts
 * @description MCP bootSweep — 감시 경로의 미기록 변경을 부팅당 1회 스캔해
 * `.maencof-meta/changelog-state.json` 의 pending 에 기록한다.
 *
 * 감지는 세션 경계(부팅) 1회, 강제는 차단이 아니라 SessionStart 의 1줄 권고 —
 * 매 턴 git spawn 과 세션 종료 차단을 피하는 배치다. 변경 자체는 git 이
 * 보존하므로 스캔 누락은 다음 부팅에서 자가 치유된다.
 *
 * graceful degradation: 모든 에러 catch → { continue: true }
 */
import { CHANGELOG_PENDING_MAX_CHANGES } from '../../../../constants/changelog.js';
import { readChangelogState } from '../../../../core/changelogState/operations/readChangelogState.js';
import { writeChangelogState } from '../../../../core/changelogState/operations/writeChangelogState.js';
import { appendErrorLogSafe } from '../../../../core/errorLog/operations/appendErrorLogSafe.js';
import { isMaencofVault } from '../../../shared/isMaencofVault.js';
import type {
  ChangelogDebtInput,
  ChangelogDebtResult,
} from '../types/types.js';

import { detectWatchedChanges } from './detectWatchedChanges.js';

/**
 * Changelog debt concern.
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
