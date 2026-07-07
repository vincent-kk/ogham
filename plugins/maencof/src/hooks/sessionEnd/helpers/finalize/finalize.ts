/**
 * @file finalize.ts
 * @description SessionEnd finalize concern — record the session into the per-day session
 * store (JSON) and clean session-scoped cache.
 *
 * 세션 라이프사이클은 활동 로그가 아니라 sessionStore JSON 에만 남는다 —
 * `.maencof-meta/sessions/*.md` 에는 쓰지 않는다.
 * Session recap 은 Stop 훅 관심사(stop/helpers/sessionRecap)가 담당한다 —
 * SessionEnd 는 표시가 보장되는 출력 채널이 없는 이벤트다(hooks 계약).
 */
import {
  removeSessionFiles,
  removeTurnContext,
} from '../../../../core/cacheManager/cacheManager.js';
import { appendErrorLogSafe } from '../../../../core/errorLog/errorLog.js';
import { recordSessionEnd } from '../../../../core/sessionStore/sessionStore.js';
import { buildDailyDigest } from '../../../../core/workIndex/workIndex.js';
import { isMaencofVault } from '../../../shared/isMaencofVault.js';

export interface SessionEndInput {
  session_id?: string;
  cwd?: string;
  /** Skills invoked during the session. */
  skills_used?: string[];
  /** Files modified during the session. */
  files_modified?: string[];
}

export interface SessionEndResult {
  continue: boolean;
}

/**
 * SessionEnd Hook handler.
 * 1. Finalize the session record in `activity/sessions/{date}.json`
 * 2. Clean up session-scoped context-injection cache
 */
export function runSessionEnd(input: SessionEndInput): SessionEndResult {
  const cwd = input.cwd ?? process.cwd();

  if (!isMaencofVault(cwd)) return { continue: true };

  // 1. Finalize the session in the per-day session store (JSON, keyed by session_id),
  //    then rebuild that day's work-history digest. recordSessionEnd returns the date
  //    it wrote to (handles midnight-crossover), so the digest targets the right day.
  try {
    const date = recordSessionEnd(cwd, {
      sessionId: input.session_id ?? 'unknown',
      skillsUsed: input.skills_used ?? [],
      filesModified: input.files_modified ?? [],
    });
    buildDailyDigest(cwd, date);
  } catch (e) {
    appendErrorLogSafe(cwd, {
      hook: 'session-end',
      error: String(e),
      timestamp: new Date().toISOString(),
    });
  }

  // 2. Clean up context injection cache (session-specific files only)
  try {
    const sessionId = input.session_id ?? '';
    if (sessionId) removeSessionFiles(sessionId, cwd);

    // turn-context는 session-scope이므로 sessionId와 무관하게 종료 시 폐기
    removeTurnContext(cwd);
  } catch (e) {
    appendErrorLogSafe(cwd, {
      hook: 'session-end',
      error: String(e),
      timestamp: new Date().toISOString(),
    });
  }

  return { continue: true };
}
