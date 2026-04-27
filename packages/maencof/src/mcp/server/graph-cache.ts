/**
 * @file graph-cache.ts
 * @description Vault path resolution + in-memory graph cache.
 * Read-path freshness gating is delegated to middlewares/freshness-guard;
 * background rebuild lifecycle to middlewares/background-rebuild.
 */
import { homedir } from 'node:os';
import { resolve } from 'node:path';

import { MetadataStore } from '../../core/indexer/index.js';
import { invalidateQueryCache } from '../../search/query-engine/index.js';
import type { KnowledgeGraph } from '../../types/graph.js';

import { ensureFreshGraphNonBlocking } from './middlewares/freshness-guard.js';

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
 * Read-path freshness 가드 thin wrapper.
 * 절대 in-flight rebuild를 await하지 않는다 — middlewares/freshness-guard가 즉시 그래프 reference를 반환한다.
 */
export async function ensureFreshGraph(
  vaultPath: string,
): Promise<KnowledgeGraph | null> {
  return ensureFreshGraphNonBlocking(vaultPath);
}

export function invalidateCache(): void {
  cachedGraph = null;
  cacheVaultPath = null;
  invalidateQueryCache();
}
