/**
 * @file freshness-guard.ts
 * @description Read-path freshness gate. Always non-blocking — returns the
 * current graph reference immediately, never awaits an in-flight rebuild.
 */
import {
  READ_REINDEX_CAP,
  STALE_REBUILD_THRESHOLD,
} from '../../../constants/thresholds.js';
import { MetadataStore } from '../../../core/indexer/index.js';
import type { KnowledgeGraph } from '../../../types/graph.js';
import { loadGraphIfNeeded } from '../graph-cache/index.js';

import { triggerBackgroundRebuild } from './background-rebuild.js';
import { mergeStaleNodesIntoGraph } from './partial-reindex.js';

/**
 * Read-path freshness 가드.
 *
 * - graph 없음 → null 반환.
 * - stale 0 → graph 그대로 반환.
 * - stale 1..N → 가장 최근 READ_REINDEX_CAP 개 항목만 in-memory partial reindex 후 graph 반환.
 * - stale ≥ STALE_REBUILD_THRESHOLD → background rebuild fire-and-forget (await X).
 */
export async function ensureFreshGraphNonBlocking(
  vaultPath: string,
): Promise<KnowledgeGraph | null> {
  const graph = await loadGraphIfNeeded(vaultPath);
  if (!graph) return null;

  const store = new MetadataStore(vaultPath);
  const stale = await store.loadStaleEntries();

  if (stale.entries.length === 0) return graph;

  const toProcess =
    stale.entries.length > READ_REINDEX_CAP
      ? stale.entries.slice(-READ_REINDEX_CAP)
      : stale.entries;
  await mergeStaleNodesIntoGraph(vaultPath, graph, toProcess);

  if (stale.entries.length >= STALE_REBUILD_THRESHOLD)
    triggerBackgroundRebuild(vaultPath);

  return graph;
}
