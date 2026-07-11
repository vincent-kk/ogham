/**
 * @file registerShutdown.ts
 * @description 서버 종료 시 자기 세션 즉시 마감 + 완결 finalizer 스폰 (shared 런타임 위임).
 *
 * shared `@ogham/session-finalizer` 에 위임한다: guard=isMaencofVault 통과 시
 * onShutdown 이 동기 정밀 마감(turn-context 폐기 + `CLAUDE_CODE_SESSION_ID`
 * 미문서화 env 가 있으면 그 세션만 sweep·digest·캐시 삭제)을 수행하고,
 * detached=true 로 SIGINT/SIGTERM 시 `node <mcp-server> --finalize <vault>` 를
 * 스폰해 무거운 bootSweep 체인(changelog·archive·commit·prune)을 grace(~400ms)
 * 밖에서 완결한다. 스폰 미착지·하드킬 시 다음 boot sweep 이 멱등 폴백.
 */
import { registerShutdownFinalizer } from '@ogham/session-finalizer';

import {
  removeSessionFiles,
  removeTurnContext,
} from '../../../../core/cacheManager/index.js';
import { appendErrorLogSafe } from '../../../../core/errorLog/index.js';
import { sweepStaleSessions } from '../../../../core/sessionStore/index.js';
import { buildDailyDigest } from '../../../../core/workIndex/index.js';
import { isMaencofVault } from '../../../../hooks/shared/index.js';

export function registerShutdown(vaultPath: string): void {
  registerShutdownFinalizer({
    ctx: vaultPath,
    guard: isMaencofVault,
    onShutdown: (v) => {
      try {
        removeTurnContext(v);
        const sessionId = process.env.CLAUDE_CODE_SESSION_ID;
        if (sessionId) {
          const { dates } = sweepStaleSessions(v, {
            staleThresholdMs: 0,
            sessionId,
          });
          for (const date of dates) buildDailyDigest(v, date);
          removeSessionFiles(sessionId, v);
        }
      } catch (e) {
        // cleanup failure must never affect the exit path — record for diagnosis
        appendErrorLogSafe(v, {
          hook: 'mcp-shutdown',
          error: String(e),
          timestamp: new Date().toISOString(),
        });
      }
    },
    detached: true,
  });
}
