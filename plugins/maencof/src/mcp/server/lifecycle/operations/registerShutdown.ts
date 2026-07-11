/**
 * @file registerShutdown.ts
 * @description 서버 종료 시 자기 세션 즉시 마감 + 완결 finalizer 스폰.
 *
 * 호스트는 SIGINT 후 ~400ms 만에 SIGKILL 한다(실측) — 핸들러는 동기 경량만
 * 수행한다: turn-context 폐기 + `CLAUDE_CODE_SESSION_ID`(미문서화 env) 가
 * 있으면 그 세션만 정밀 마감·캐시 삭제. async 작업(git 커밋 등)은 절단 시
 * index.lock 잔존 위험이 있어 shutdown 에서 실행하지 않고, SIGINT/SIGTERM 시
 * `node <mcp-server> --finalize <vault>` detached 프로세스를 스폰해 무거운
 * bootSweep 체인(changelog·archive·commit·prune)을 grace 밖에서 완결한다.
 * 스폰 미착지·하드킬 시 다음 boot sweep 이 멱등 폴백.
 */
import { spawnDetached } from '@ogham/cross-platform/spawn';

import {
  removeSessionFiles,
  removeTurnContext,
} from '../../../../core/cacheManager/index.js';
import { appendErrorLogSafe } from '../../../../core/errorLog/index.js';
import { sweepStaleSessions } from '../../../../core/sessionStore/index.js';
import { buildDailyDigest } from '../../../../core/workIndex/index.js';
import { isMaencofVault } from '../../../../hooks/shared/index.js';

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
  // Detached finalizer: complete the heavy bootSweep chain off the ~400ms grace
  // window (surviving SIGKILL). Spawns node, not git — git runs inside the
  // child. bootSweep at next boot is the idempotent fallback if the spawn never
  // lands (hard SIGKILL, spawn failure).
  const spawnFinalizer = (): void => {
    if (!isMaencofVault(vaultPath)) return;
    const entry = process.argv[1];
    if (entry)
      spawnDetached(process.execPath, [entry, '--finalize', vaultPath]);
  };
  process.once('exit', shutdown);
  for (const signal of SHUTDOWN_SIGNALS)
    process.once(signal, () => {
      shutdown();
      spawnFinalizer();
      process.exit(0);
    });
}
