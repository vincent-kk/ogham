/**
 * @file graphCache.ts
 * @description Vault path resolution + in-memory graph cache.
 * Read-path freshness gating lives in middlewares/freshnessGuard and background
 * rebuild lifecycle in middlewares/backgroundRebuild; callers reach those
 * directly — wrapping them here would make the two modules import each other.
 */
import { resolve } from 'node:path';

import { tryProjectRoot } from '@ogham/cross-platform/host-paths';
import { home } from '@ogham/cross-platform/paths';

import { MetadataStore } from '../../../core/indexer/index.js';
import { invalidateQueryCache } from '../../../search/queryEngine/index.js';
import type { KnowledgeGraph } from '../../../types/graph.js';

/** Blocked prefixes for global config path access */
const BLOCKED_PREFIXES = [
  resolve(home(), '.claude'),
  resolve(home(), '.config'),
];

/**
 * vault path (from environment variable or the host's workspace root).
 * Blocks access to global config paths.
 */
export function getVaultPath(): string {
  const raw = process.env['MAENCOF_VAULT_PATH'] ?? tryProjectRoot();
  if (raw === null)
    throw new Error(
      'Cannot determine the vault path: this MCP server does not run from the vault directory on this host. Set MAENCOF_VAULT_PATH to the absolute path of the vault.',
    );

  const resolved = resolve(raw);

  for (const prefix of BLOCKED_PREFIXES)
    if (resolved.startsWith(prefix))
      throw new Error(`Access to global config path is blocked: ${resolved}`);

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

export function invalidateCache(): void {
  cachedGraph = null;
  cacheVaultPath = null;
  invalidateQueryCache();
}
