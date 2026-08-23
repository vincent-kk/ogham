/**
 * @file graphCache.ts
 * @description Vault path resolution + in-memory graph cache.
 * Read-path freshness gating lives in middlewares/freshnessGuard and background
 * rebuild lifecycle in middlewares/backgroundRebuild; callers reach those
 * directly — wrapping them here would make the two modules import each other.
 */
import { isAbsolute, relative, resolve, sep } from 'node:path';

import {
  HOSTS,
  type KnownHost,
  canonicalizeTargetPathSync,
  home,
  hostStateRoot,
  tryProjectRoot,
} from '@ogham/cross-platform';

import { MetadataStore } from '../../../core/indexer/index.js';
import { invalidateQueryCache } from '../../../search/queryEngine/index.js';
import type { KnowledgeGraph } from '../../../types/graph.js';

const PROTECTED_HOSTS = Object.keys(HOSTS) as KnownHost[];

function protectedRoots(): readonly string[] {
  return [
    ...new Set([
      ...PROTECTED_HOSTS.map((host) => hostStateRoot(host, process.env)),
      resolve(home(), '.config'),
    ]),
  ].map((root) => canonicalizeTargetPathSync(process.cwd(), root));
}

function isSameOrDescendant(target: string, root: string): boolean {
  const remainder = relative(root, target);
  return (
    remainder === '' ||
    (remainder !== '..' &&
      !remainder.startsWith(`..${sep}`) &&
      !isAbsolute(remainder))
  );
}

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

  const resolved = canonicalizeTargetPathSync(process.cwd(), raw);

  for (const root of protectedRoots())
    if (isSameOrDescendant(resolved, root))
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
