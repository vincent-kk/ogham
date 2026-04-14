/**
 * @file graph-cache.ts
 * @description Graph lifecycle management: vault path resolution, graph caching, and invalidation.
 */
import { homedir } from 'node:os';
import { resolve } from 'node:path';

import { MetadataStore } from '../../core/indexer/index.js';
import { invalidateQueryCache } from '../../search/query-engine/index.js';
import type { KnowledgeGraph } from '../../types/graph.js';

import { handleKgBuild } from '../tools/kg-build/index.js';

/** Blocked prefixes for global config path access */
const BLOCKED_PREFIXES = [
  resolve(homedir(), '.claude'),
  resolve(homedir(), '.config'),
];

/**
 * vault path (from environment variable or CWD).
 * Blocks access to global config paths.
 */
export function getVaultPath(): string {
  const raw = process.env['MAENCOF_VAULT_PATH'] ?? process.cwd();
  const resolved = resolve(raw);

  for (const prefix of BLOCKED_PREFIXES) {
    if (resolved.startsWith(prefix)) {
      throw new Error(`Access to global config path is blocked: ${resolved}`);
    }
  }

  return resolved;
}

/** Graph cache (preserved in memory for the server lifecycle) */
let cachedGraph: KnowledgeGraph | null = null;
let cacheVaultPath: string | null = null;

/** Rebuild mutex — prevents duplicate concurrent rebuilds */
let rebuildInProgress: Promise<void> | null = null;

export async function loadGraphIfNeeded(
  vaultPath: string,
): Promise<KnowledgeGraph | null> {
  if (cachedGraph && cacheVaultPath === vaultPath) return cachedGraph;

  const store = new MetadataStore(vaultPath);
  const graph = await store.loadGraph();
  if (graph) {
    cachedGraph = graph;
    cacheVaultPath = vaultPath;
  }
  return graph;
}

/**
 * Read-path auto-rebuild: stale 노드가 있으면 증분 리빌드 후 fresh 그래프를 반환한다.
 * kg_status는 진단 도구이므로 이 함수를 사용하지 않는다 (loadGraphIfNeeded 사용).
 */
export async function ensureFreshGraph(
  vaultPath: string,
): Promise<KnowledgeGraph | null> {
  if (rebuildInProgress) {
    await rebuildInProgress;
    return loadGraphIfNeeded(vaultPath);
  }

  const store = new MetadataStore(vaultPath);
  const staleNodes = await store.loadStaleNodes();

  if (staleNodes.paths.length === 0) {
    return loadGraphIfNeeded(vaultPath);
  }

  let resolveMutex!: () => void;
  rebuildInProgress = new Promise<void>((r) => {
    resolveMutex = r;
  });

  try {
    const result = await handleKgBuild(vaultPath, { force: false });
    if (result.success) {
      const freshGraph = await store.loadGraph();
      if (freshGraph) {
        cachedGraph = freshGraph;
        cacheVaultPath = vaultPath;
        return freshGraph;
      }
    }
  } finally {
    rebuildInProgress = null;
    resolveMutex();
  }

  return loadGraphIfNeeded(vaultPath);
}

export function invalidateCache(): void {
  cachedGraph = null;
  cacheVaultPath = null;
  invalidateQueryCache();
}
