/**
 * @file mutate-side-effects.ts
 * @description Mutate 도구 1회 후 stale-entries append + usage-stats + 임계치 도달 시 background rebuild.
 */
import { STALE_REBUILD_THRESHOLD } from '../../../constants/thresholds.js';
import { appendErrorLogSafe } from '../../../core/error-log/index.js';
import { MetadataStore } from '../../../core/indexer/index.js';
import type { StaleEntry } from '../../../core/indexer/metadata-store/metadata-store.js';

import { triggerBackgroundRebuild } from './background-rebuild.js';
import { incrementUsageStat } from './usage-stats.js';

/**
 * toolName + 영향 path 쌍에서 stale entries 를 도출한다.
 *
 * - `delete` → primary 한 건 op='delete'.
 * - `move` → primary(src) op='delete', also(dst) op='mutate'.
 * - 나머지(`create` / `update` / `capture_insight` / `boundary_create`) → primary/also 모두 op='mutate'.
 */
function classifyEntries(
  toolName: string,
  primary: string | null,
  also: string | null | undefined,
): StaleEntry[] {
  const entries: StaleEntry[] = [];
  if (toolName === 'delete') {
    if (primary) entries.push({ path: primary, op: 'delete' });
    return entries;
  }
  if (toolName === 'move') {
    if (primary) entries.push({ path: primary, op: 'delete' });
    if (also && also !== primary) entries.push({ path: also, op: 'mutate' });
    return entries;
  }
  if (primary) entries.push({ path: primary, op: 'mutate' });
  if (also && also !== primary) entries.push({ path: also, op: 'mutate' });
  return entries;
}

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
    const entries = classifyEntries(toolName, affectedPath, alsoAffectedPath);

    if (entries.length > 0) {
      await store.appendStaleEntries(entries);
    }

    await incrementUsageStat(vaultPath, toolName);

    const stale = await store.loadStaleEntries();
    if (stale.entries.length >= STALE_REBUILD_THRESHOLD) {
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
