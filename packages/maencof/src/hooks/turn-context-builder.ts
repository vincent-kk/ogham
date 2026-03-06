/**
 * @file turn-context-builder.ts
 * @description Builds compressed XML turn context from lightweight vault metadata.
 * Called by context-injector (initial build) and cache-updater (refresh after mutations).
 * All output MUST be in English.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { PinnedNode } from './cache-manager.js';
import { readPinnedNodes } from './cache-manager.js';

/** Default stale threshold percentage */
const STALE_THRESHOLD_PERCENT = 10;

interface IndexMetadata {
  totalNodes: number;
  layerCounts: Record<number, number>;
}

/**
 * Read index.json and extract node count + layer distribution.
 * Returns zeros on any failure.
 */
export function readIndexMetadata(cwd: string): IndexMetadata {
  const indexPath = join(cwd, '.maencof', 'index.json');
  const result: IndexMetadata = { totalNodes: 0, layerCounts: {} };
  try {
    if (!existsSync(indexPath)) return result;
    const raw = readFileSync(indexPath, 'utf-8');
    const parsed = JSON.parse(raw) as { nodes?: unknown };

    let nodes: Array<{ layer?: number }> = [];
    if (Array.isArray(parsed.nodes)) {
      nodes = parsed.nodes as Array<{ layer?: number }>;
    } else if (parsed.nodes && typeof parsed.nodes === 'object') {
      nodes = Object.values(parsed.nodes) as Array<{ layer?: number }>;
    }

    result.totalNodes = nodes.length;
    for (const node of nodes) {
      const layer = typeof node.layer === 'number' ? node.layer : 0;
      result.layerCounts[layer] = (result.layerCounts[layer] ?? 0) + 1;
    }
  } catch {
    // silent fallback
  }
  return result;
}

/**
 * Read stale node count from .maencof/stale-nodes.json.
 */
export function readStaleCount(cwd: string): number {
  const stalePath = join(cwd, '.maencof', 'stale-nodes.json');
  try {
    if (!existsSync(stalePath)) return 0;
    const raw = readFileSync(stalePath, 'utf-8');
    const parsed = JSON.parse(raw) as { paths?: unknown };
    return Array.isArray(parsed.paths) ? parsed.paths.length : 0;
  } catch {
    return 0;
  }
}

/**
 * Read companion name from .maencof-meta/companion-identity.json.
 */
function readCompanionName(cwd: string): string | null {
  const identityPath = join(cwd, '.maencof-meta', 'companion-identity.json');
  try {
    if (!existsSync(identityPath)) return null;
    const raw = JSON.parse(readFileSync(identityPath, 'utf-8')) as {
      name?: string;
    };
    return typeof raw.name === 'string' ? raw.name : null;
  } catch {
    return null;
  }
}

/**
 * Format layer counts as "L1:N,L2:N,L3:N,L4:N,L5:N".
 */
function formatLayerCounts(layerCounts: Record<number, number>): string {
  return [1, 2, 3, 4, 5].map((l) => `L${l}:${layerCounts[l] ?? 0}`).join(',');
}

/**
 * Format pinned nodes as comma-separated titles.
 */
function formatPinnedNodes(nodes: PinnedNode[]): string {
  return nodes.map((n) => n.title).join(',');
}

/**
 * Build the compressed XML turn context.
 * All content in English. Target: <500 chars normal, <700 chars with stale advisory.
 */
export function buildTurnContext(cwd: string): string {
  const { totalNodes, layerCounts } = readIndexMetadata(cwd);
  const staleCount = readStaleCount(cwd);
  const companionName = readCompanionName(cwd);
  const pinnedNodes = readPinnedNodes(cwd);

  const freshPercent =
    totalNodes > 0
      ? Math.round(((totalNodes - staleCount) / totalNodes) * 100)
      : 100;

  const vaultAttr = companionName ? ` vault="${companionName}"` : '';
  const pinnedText = formatPinnedNodes(pinnedNodes);

  const parts: string[] = [];

  // <kg-core> tag
  parts.push(
    `<kg-core${vaultAttr} nodes="${totalNodes}" fresh="${freshPercent}%" layers="${formatLayerCounts(layerCounts)}" stale="${staleCount}">`,
  );
  parts.push(`  <pinned>${pinnedText}</pinned>`);
  parts.push('</kg-core>');

  // <kg-directive> tag
  parts.push(
    '<kg-directive>When encountering ambiguous or domain-specific terms, autonomously search the knowledge graph using kg_search before responding. For topics beyond L1 core knowledge, use kg_navigate to explore L2+ layers. Use kg_context for complex queries — it returns relevant content snippets from top documents. Prefer kg_context over kg_search + maencof_read when you need content from multiple related documents.</kg-directive>',
  );

  // <kg-stale-advisory> if threshold exceeded
  const staleRatio =
    totalNodes > 0 ? Math.round((staleCount / totalNodes) * 100) : 0;
  if (staleRatio > STALE_THRESHOLD_PERCENT) {
    parts.push(
      `<kg-stale-advisory threshold="exceeded" stale="${staleCount}/${totalNodes}" ratio="${staleRatio}%">ACTION REQUIRED: Run kg_build to rebuild the knowledge graph index. Stale ratio exceeds ${STALE_THRESHOLD_PERCENT}%. Search results may be inaccurate until rebuilt.</kg-stale-advisory>`,
    );
  }

  return parts.join('\n');
}
