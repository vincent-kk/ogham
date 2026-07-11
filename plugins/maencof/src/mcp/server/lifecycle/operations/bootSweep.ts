/**
 * @file bootSweep.ts
 * @description MCP 부팅 시 직전 세션 잔여 완결 — SessionEnd 훅 대체의 보장 경로.
 *
 * 서버 프로세스는 세션과 1:1 수명이므로 부팅은 "직전 세션이 끝났다"의 3-호스트
 * 공통 신호다. 순서는 구 orchestrateSessionEnd 불변식을 보존한다: turn-context
 * 폐기(세션 경계 캐시) → 미마감 세션 sweep 마감(+digest) → personal-context
 * prune → changelog 미기록 스캔 → L4 만료 아카이빙 → vault 자동 커밋(마지막 —
 * 앞 산출물이 그 커밋에 포함). 전 단계 멱등 — 훅 병존기·동시 세션 이중 실행 무해.
 */
import { STALE_SESSION_THRESHOLD_MS } from '../../../../constants/sessionSweep.js';
import { removeTurnContext } from '../../../../core/cacheManager/index.js';
import { appendErrorLogSafe } from '../../../../core/errorLog/index.js';
import { prunePersonalContext } from '../../../../core/personalContext/index.js';
import { sweepStaleSessions } from '../../../../core/sessionStore/index.js';
import { buildDailyDigest } from '../../../../core/workIndex/index.js';
import { isMaencofVault } from '../../../../hooks/shared/index.js';
import { runArchiveExpired } from '../../../../hooks/utils/archiveExpired/index.js';
import { runChangelogDebt } from '../../../../hooks/utils/changelogDebt/index.js';
import { runVaultCommitter } from '../../../../hooks/utils/vaultCommitter/index.js';

export async function bootSweep(vaultPath: string): Promise<void> {
  if (!isMaencofVault(vaultPath)) return;
  try {
    removeTurnContext(vaultPath);
    const { dates } = sweepStaleSessions(vaultPath, {
      staleThresholdMs: STALE_SESSION_THRESHOLD_MS,
    });
    for (const date of dates) buildDailyDigest(vaultPath, date);
    prunePersonalContext(vaultPath);
    await runChangelogDebt({ cwd: vaultPath });
    await runArchiveExpired(vaultPath);
    await runVaultCommitter({ cwd: vaultPath }, 'BootSweep');
  } catch (e) {
    appendErrorLogSafe(vaultPath, {
      hook: 'mcp-boot-sweep',
      error: String(e),
      timestamp: new Date().toISOString(),
    });
  }
}
