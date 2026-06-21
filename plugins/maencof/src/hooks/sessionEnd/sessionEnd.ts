/**
 * @file sessionEnd.ts
 * @description SessionEnd Hook — record the session into the per-day session
 * store (JSON), clean session-scoped cache, and build the user-facing recap.
 *
 * 세션 요약은 더 이상 `.maencof-meta/sessions/*.md` 에 쓰지 않는다(자연 폐기).
 * 세션 라이프사이클은 활동 로그가 아니라 sessionStore JSON 에만 남는다.
 */
import { isSessionRecapDisabled } from '../../core/dialogueConfig/index.js';
import { appendErrorLogSafe } from '../../core/errorLog/index.js';
import { readPendingNotification } from '../../core/insightStats/index.js';
import { recordSessionEnd } from '../../core/sessionStore/index.js';
import { buildDailyRollup } from '../../core/workIndex/index.js';
import {
  removeSessionFiles,
  removeTurnContext,
} from '../cacheManager/index.js';
import { isMaencofVault } from '../shared/index.js';

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
  /**
   * Optional human-facing recap shown at session termination.
   * Populated when `dialogue-config.json::session_recap.enabled !== false`.
   */
  message?: string;
}

/**
 * SessionEnd Hook handler.
 * 1. Finalize the session record in `activity/sessions/{date}.json`
 * 2. Clean up session-scoped context-injection cache
 * 3. Build the user-facing session recap (off-switch honored)
 */
export function runSessionEnd(input: SessionEndInput): SessionEndResult {
  const cwd = input.cwd ?? process.cwd();

  if (!isMaencofVault(cwd)) {
    return { continue: true };
  }

  // 1. Finalize the session in the per-day session store (JSON, keyed by session_id),
  //    then rebuild that day's work-history rollup. recordSessionEnd returns the date
  //    it wrote to (handles midnight-crossover), so the rollup targets the right day.
  try {
    const date = recordSessionEnd(cwd, {
      sessionId: input.session_id ?? 'unknown',
      skillsUsed: input.skills_used ?? [],
      filesModified: input.files_modified ?? [],
    });
    buildDailyRollup(cwd, date);
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
    if (sessionId) {
      removeSessionFiles(sessionId, cwd);
    }
    // turn-context는 session-scope이므로 sessionId와 무관하게 종료 시 폐기
    removeTurnContext(cwd);
  } catch (e) {
    appendErrorLogSafe(cwd, {
      hook: 'session-end',
      error: String(e),
      timestamp: new Date().toISOString(),
    });
  }

  // 3. Build session recap (off-switch honored)
  const result: SessionEndResult = { continue: true };
  try {
    if (!isSessionRecapDisabled(cwd)) {
      const recap = buildSessionRecap(input, cwd);
      if (recap !== null) result.message = recap;
    }
  } catch (e) {
    appendErrorLogSafe(cwd, {
      hook: 'session-end',
      error: String(e),
      timestamp: new Date().toISOString(),
    });
  }

  return result;
}

/**
 * Build a human-facing session recap message.
 *
 * Surfaces the count of refined specs (files modified), agreed premises,
 * tentative principles, and unresolved tensions. Pending insight captures
 * are reused as a proxy for "principles" when no richer source exists.
 *
 * Returns null when there is no meaningful content to report (avoids noise).
 */
function buildSessionRecap(input: SessionEndInput, cwd: string): string | null {
  const files = input.files_modified ?? [];
  const pending = readPendingNotification(cwd);
  const captures = pending?.captures ?? [];
  const tentativePrinciples = captures
    .filter((c) => c.layer === 2)
    .map((c) => `  - ${c.title}`);
  const agreedPremises = captures
    .filter((c) => c.layer === 5)
    .map((c) => `  - ${c.title}`);

  const hasContent =
    files.length > 0 ||
    tentativePrinciples.length > 0 ||
    agreedPremises.length > 0;
  if (!hasContent) return null;

  const lines: string[] = ['[maencof] Session Recap'];
  lines.push(`- Refined specs this session: ${files.length}`);
  lines.push(
    `- Agreed premises:${agreedPremises.length > 0 ? '\n' + agreedPremises.join('\n') : ' (none)'}`,
  );
  lines.push(
    `- Tentative principles:${tentativePrinciples.length > 0 ? '\n' + tentativePrinciples.join('\n') : ' (none)'}`,
  );
  lines.push('- Unresolved tensions: (none)');
  lines.push('To save this recap, run /maencof:remember.');
  return lines.join('\n');
}
