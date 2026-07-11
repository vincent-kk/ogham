/**
 * @file registerShutdown.ts
 * @description 서버 종료 시 자기 세션 즉시 마감 — best-effort 가속 경로.
 *
 * 호스트는 SIGINT 후 ~400ms 만에 SIGKILL 한다(실측) — 핸들러는 동기 경량만
 * 수행한다: turn-context 폐기 + `CLAUDE_CODE_SESSION_ID`(미문서화 env) 가
 * 있으면 그 세션만 정밀 마감·캐시 삭제. env 부재(타 호스트·향후 변경) 시
 * 마감은 다음 boot sweep 이 담당한다. async 작업(git 커밋 등)은 절단 시
 * index.lock 잔존 위험이 있어 여기서 실행하지 않는다.
 */
import { removeSessionFiles } from '../../../core/cacheManager/operations/removeSessionFiles.js';
import { removeTurnContext } from '../../../core/cacheManager/operations/removeTurnContext.js';
import { appendErrorLogSafe } from '../../../core/errorLog/operations/appendErrorLogSafe.js';
import { sweepStaleSessions } from '../../../core/sessionStore/index.js';
import { buildDailyDigest } from '../../../core/workIndex/index.js';
import { isMaencofVault } from '../../../hooks/shared/isMaencofVault.js';

let registered = false;

const SHUTDOWN_SIGNALS = ['SIGINT', 'SIGTERM'] as const;

export function registerShutdown(vaultPath: string): void {
  if (registered) return;
  registered = true;
  const shutdown = (): void => {
    try {
      if (!isMaencofVault(vaultPath)) return;
      removeTurnContext(vaultPath);
      const sessionId = process.env.CLAUDE_CODE_SESSION_ID;
      if (sessionId) {
        const { dates } = sweepStaleSessions(vaultPath, {
          staleThresholdMs: 0,
          sessionId,
        });
        for (const date of dates) buildDailyDigest(vaultPath, date);
        removeSessionFiles(sessionId, vaultPath);
      }
    } catch (e) {
      // cleanup failure must never affect the exit path — record for diagnosis
      appendErrorLogSafe(vaultPath, {
        hook: 'mcp-shutdown',
        error: String(e),
        timestamp: new Date().toISOString(),
      });
    }
  };
  process.once('exit', shutdown);
  for (const signal of SHUTDOWN_SIGNALS)
    process.once(signal, () => {
      shutdown();
      process.exit(0);
    });
}
