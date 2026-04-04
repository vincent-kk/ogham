import { MetadataStore } from '@ogham/maencof';
import type { KnowledgeGraph } from '@ogham/maencof';

interface CacheEntry {
  graph: KnowledgeGraph;
  loadedAt: number;
}

/**
 * Per-vault KnowledgeGraph memory cache.
 * Session-scoped: no TTL, no auto-rebuild.
 */
export class GraphCache {
  private readonly cache = new Map<string, CacheEntry>();

  /** Get graph for a vault path. Lazy-loads on first access. */
  async getGraph(vaultPath: string): Promise<KnowledgeGraph | null> {
    const entry = this.cache.get(vaultPath);
    if (entry) return entry.graph;

    try {
      const store = new MetadataStore(vaultPath);
      const graph = await store.loadGraph();
      if (!graph) return null;
      this.cache.set(vaultPath, { graph, loadedAt: Date.now() });
      return graph;
    } catch {
      return null;
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
