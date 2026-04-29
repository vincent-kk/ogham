import { stat } from 'node:fs/promises';
import { join } from 'node:path';

import {
  MetadataStore,
  mergeStaleNodesIntoGraph,
  READ_REINDEX_CAP,
} from '@ogham/maencof';
import type { KnowledgeGraph } from '@ogham/maencof';

interface CacheEntry {
  graph: KnowledgeGraph;
  loadedAt: number;
  /**
   * stale-nodes.json mtimeMs at last successful applyStaleMerge.
   * null = never observed; -1 = file missing at last check.
   */
  lastStaleMtimeMs: number | null;
}

/**
 * Per-vault KnowledgeGraph memory cache. Session-scoped: no TTL, no auto-rebuild.
 *
 * The mtime guard is safe to use as a skip signal because metadata-store writes
 * stale-nodes.json via tmp-file + fs.rename — mtime advance and new-entry
 * visibility are atomic, so the guard never observes a half-written file.
 */
export class GraphCache {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly inFlight = new Map<string, Promise<void>>();

  /** Get graph for a vault path. Lazy-loads on first access, then applies stale-merge each call. */
  async getGraph(vaultPath: string): Promise<KnowledgeGraph | null> {
    const entry = this.cache.get(vaultPath);
    if (entry) {
      await this.ensureMergeApplied(vaultPath, entry);
      return entry.graph;
    }

    try {
      const store = new MetadataStore(vaultPath);
      const graph = await store.loadGraph();
      if (!graph) return null;
      const fresh: CacheEntry = {
        graph,
        loadedAt: Date.now(),
        lastStaleMtimeMs: null,
      };
      this.cache.set(vaultPath, fresh);
      await this.ensureMergeApplied(vaultPath, fresh);
      return graph;
    } catch {
      return null;
    }
  }

  /**
   * Coalesce concurrent merge attempts for the same vault. A new mtime that
   * arrives mid-flight is observed by the next getGraph call (1-tick lag —
   * intentional under "read availability outranks freshness"; not a bug).
   */
  private async ensureMergeApplied(
    vaultPath: string,
    entry: CacheEntry,
  ): Promise<void> {
    const existing = this.inFlight.get(vaultPath);
    if (existing) return existing;
    const p = this.applyStaleMerge(vaultPath, entry).finally(() => {
      this.inFlight.delete(vaultPath);
    });
    this.inFlight.set(vaultPath, p);
    return p;
  }

  // Idempotent stale-nodes.json merge. Failures are swallowed so a corrupt
  // stale file never blocks read availability — caller still gets the graph.
  private async applyStaleMerge(
    vaultPath: string,
    entry: CacheEntry,
  ): Promise<void> {
    try {
      const currentMtime = await this.readStaleMtime(vaultPath);
      if (currentMtime === entry.lastStaleMtimeMs) return;
      const store = new MetadataStore(vaultPath);
      const stale = await store.loadStaleEntries();
      if (stale.entries.length === 0) {
        entry.lastStaleMtimeMs = currentMtime;
        return;
      }
      const toProcess =
        stale.entries.length > READ_REINDEX_CAP
          ? stale.entries.slice(-READ_REINDEX_CAP)
          : stale.entries;
      await mergeStaleNodesIntoGraph(vaultPath, entry.graph, toProcess);
      entry.lastStaleMtimeMs = currentMtime;
    } catch {
      // read availability outranks fresh-graph guarantee; mtime 미갱신으로 다음 호출에서 재시도.
    }
  }

  private async readStaleMtime(vaultPath: string): Promise<number> {
    try {
      const file = join(vaultPath, '.maencof', 'stale-nodes.json');
      const s = await stat(file);
      return s.mtimeMs;
    } catch {
      return -1;
    }
  }

  /** Invalidate a specific vault's cached graph. */
  invalidate(vaultPath: string): void {
    this.cache.delete(vaultPath);
  }

  /** Clear all cached graphs. */
  invalidateAll(): void {
    this.cache.clear();
  }

  /** Check if a vault's graph is currently loaded. */
  isLoaded(vaultPath: string): boolean {
    return this.cache.has(vaultPath);
  }
}
