/**
 * @file usageStats.ts
 * @description Per-vault tool usage counter. Atomic write + per-vault mutex.
 * Failures are swallowed via appendErrorLogSafe so callers can fire-and-forget.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { MAENCOF_META_DIR } from '../../../constants/directories.js';
import { USAGE_STATS_FILE } from '../../../constants/usageStats.js';
import { appendErrorLogSafe } from '../../../core/errorLog/index.js';
import {
  atomicWriteJson,
  withVaultLock,
} from '../../../core/indexer/metadataStore/index.js';

/**
 * `${vaultPath}/${MAENCOF_META_DIR}/usage-stats.json`에서 toolName 호출 수를 1 증가시킨다.
 *
 * - vault mutex로 직렬화, atomic write+rename으로 partial write 차단.
 * - 극단 contention에서는 +1 손실이 가능하지만 통계 SLA에 영향 없는 수준이다.
 * - 실패는 appendErrorLogSafe로 흐림.
 */
export async function incrementUsageStat(
  vaultPath: string,
  toolName: string,
): Promise<void> {
  try {
    const statsPath = join(vaultPath, MAENCOF_META_DIR, USAGE_STATS_FILE);
    await withVaultLock(vaultPath, async () => {
      let stats: Record<string, number> = {};
      if (existsSync(statsPath)) {
        try {
          stats = JSON.parse(readFileSync(statsPath, 'utf-8')) as Record<
            string,
            number
          >;
        } catch {
          stats = {};
        }
      }
      stats[toolName] = (stats[toolName] ?? 0) + 1;
      // 통계 SLA 느슨 — 단일 retry 충분 (성능 우선; atomic-write 기본 3 과 의도적 비대칭).
      await atomicWriteJson(statsPath, stats, { retries: 1 });
    });
  } catch (err) {
    appendErrorLogSafe(vaultPath, {
      hook: 'usage-stats',
      error: String(err),
      timestamp: new Date().toISOString(),
    });
  }
}
