/**
 * @file mutate-side-effects.ts
 * @description Mutate 도구 1회 후 stale-nodes append + usage-stats + 임계치 도달 시 background rebuild.
 */
import { STALE_REBUILD_THRESHOLD } from '../../../constants/thresholds.js';
import { appendErrorLogSafe } from '../../../core/error-log/index.js';
import { MetadataStore } from '../../../core/indexer/index.js';

import { triggerBackgroundRebuild } from './background-rebuild.js';
import { incrementUsageStat } from './usage-stats.js';

/**
 * Mutate 핸들러 성공 직후 호출. caller-facing 응답은 영향 없다 (best-effort).
 */
export async function runMutateSideEffects(
  vaultPath: string,
  toolName: string,
  affectedPath: string | null,
  alsoAffectedPath?: string | null,
): Promise<void> {
  try {
    const store = new MetadataStore(vaultPath);
    const paths: string[] = [];
    if (affectedPath) paths.push(affectedPath);
    if (alsoAffectedPath && alsoAffectedPath !== affectedPath) {
      paths.push(alsoAffectedPath);
    }

    if (paths.length > 0) {
      await store.appendStaleNodes(paths);
    }

    await incrementUsageStat(vaultPath, toolName);

    const stale = await store.loadStaleNodes();
    if (stale.paths.length >= STALE_REBUILD_THRESHOLD) {
      triggerBackgroundRebuild(vaultPath);
    }
  } catch (err) {
    appendErrorLogSafe(vaultPath, {
      hook: 'mutate-side-effects',
      error: String(err),
      timestamp: new Date().toISOString(),
    });
  }
}
