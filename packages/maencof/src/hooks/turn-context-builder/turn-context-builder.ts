/**
 * @file turn-context-builder.ts
 * @description Builds compressed XML turn context from lightweight vault metadata.
 * Called by context-injector (initial build) and cache-updater (refresh after mutations).
 * All output MUST be in English.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { CompanionIdentityMinimal } from '../../types/companion-guard.js';
import { isValidCompanionIdentity } from '../../types/companion-guard.js';

import type { PinnedNode } from '../cache-manager/index.js';
import { readPinnedNodes } from '../cache-manager/index.js';

import { STALE_THRESHOLD_PERCENT } from '../../constants/thresholds.js';

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
 * Read companion identity from .maencof-meta/companion-identity.json.
 * Returns validated identity or null on any failure.
 */
export function readCompanionIdentity(
  cwd: string,
): CompanionIdentityMinimal | null {
  const identityPath = join(cwd, '.maencof-meta', 'companion-identity.json');
  try {
    if (!existsSync(identityPath)) return null;
    const raw: unknown = JSON.parse(readFileSync(identityPath, 'utf-8'));
    return isValidCompanionIdentity(raw) ? raw : null;
  } catch {
    return null;
  }
}

/**
 * Strip YAML frontmatter, heading lines, and blank lines; return first paragraph
 * up to maxChars characters.
 */
export function compressMarkdownBody(content: string, maxChars = 150): string {
  // Remove YAML frontmatter
  let text = content.replace(/^---[\s\S]*?---\n?/, '');
  // Remove heading lines and blank lines at start
  const lines = text.split('\n');
  const bodyLines: string[] = [];
  let inBody = false;
  for (const line of lines) {
    if (!inBody) {
      if (line.startsWith('#') || line.trim() === '') continue;
      inBody = true;
    }
    bodyLines.push(line);
  }
  text = bodyLines.join('\n');
  // Return first paragraph (up to first blank line), capped at maxChars
  const firstPara = text.split(/\n\n/)[0] ?? '';
  const flat = firstPara.replace(/\n/g, ' ').trim();
  return flat.length > maxChars ? flat.slice(0, maxChars) : flat;
}

interface IndexNode {
  layer?: number;
  path?: string;
  title?: string;
  tags?: string[];
}

/**
 * Read L1 nodes from index.json and return a compressed summary string.
 * Format per node: "[title]: excerpt… | tags: t1,t2,t3"
 * Returns empty string when no L1 nodes found or on any failure.
 */
export function readL1NodesSummary(cwd: string): string {
  const indexPath = join(cwd, '.maencof', 'index.json');
  try {
    if (!existsSync(indexPath)) return '';
    const parsed = JSON.parse(readFileSync(indexPath, 'utf-8')) as {
      nodes?: unknown;
    };

    let nodes: IndexNode[] = [];
    if (Array.isArray(parsed.nodes)) {
      nodes = parsed.nodes as IndexNode[];
    } else if (parsed.nodes && typeof parsed.nodes === 'object') {
      nodes = Object.values(parsed.nodes) as IndexNode[];
    }

    const l1Nodes = nodes.filter((n) => n.layer === 1);
    if (l1Nodes.length === 0) return '';

    const lines: string[] = [];
    for (const node of l1Nodes) {
      if (!node.path || !node.title) continue;
      try {
        const filePath = join(cwd, node.path);
        if (!existsSync(filePath)) continue;
        const content = readFileSync(filePath, 'utf-8');
        const excerpt = compressMarkdownBody(content);
        const tagPart =
          node.tags && node.tags.length > 0
            ? ` | tags: ${node.tags.slice(0, 3).join(',')}`
            : '';
        lines.push(`[${node.title}]: ${excerpt}${tagPart}`);
      } catch {
        // silent fallback — skip this node
      }
    }
    return lines.join('\n');
  } catch {
    return '';
  }
}

/**
 * Build compressed `<companion-identity>` XML tag from identity data.
 * Uses plain-text identity declaration for better AI internalization.
 * Target: ~200 chars max to respect C1 5-second constraint.
 */
function buildCompanionIdentityTag(identity: CompanionIdentityMinimal): string {
  const roleDecl = identity.role
    ? `You are ${identity.name}, a ${identity.role}.`
    : `You are ${identity.name}.`;
  let tag = `<companion-identity>\n  ${roleDecl}`;

  if (identity.personality) {
    const { tone, approach, traits } = identity.personality;
    const toneAttr = tone ? ` tone="${tone}"` : '';
    const approachAttr = approach ? ` approach="${approach}"` : '';
    const traitsText = traits?.length ? traits.join(',') : '';
    tag += `\n  <personality${toneAttr}${approachAttr}>${traitsText}</personality>`;
  }

  if (identity.principles?.length) {
    tag += `\n  <principles>${identity.principles.join(' | ')}</principles>`;
  }

  if (identity.taboos?.length) {
    tag += `\n  <taboos>${identity.taboos.join(' | ')}</taboos>`;
  }

  tag += '\n</companion-identity>';
  return tag;
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
  const identity = readCompanionIdentity(cwd);
  const pinnedNodes = readPinnedNodes(cwd);

  const freshPercent =
    totalNodes > 0
      ? Math.round(((totalNodes - staleCount) / totalNodes) * 100)
      : 100;

  const vaultAttr = identity ? ` vault="${identity.name}"` : '';
  const pinnedText = formatPinnedNodes(pinnedNodes);

  const parts: string[] = [];

  // <companion-identity> tag (before kg-core)
  if (identity) {
    parts.push(buildCompanionIdentityTag(identity));
  }

  // <kg-core> tag
  parts.push(
    `<kg-core${vaultAttr} nodes="${totalNodes}" fresh="${freshPercent}%" layers="${formatLayerCounts(layerCounts)}" stale="${staleCount}">`,
  );
  parts.push(`  <pinned>${pinnedText}</pinned>`);
  const l1Summary = readL1NodesSummary(cwd);
  if (l1Summary) {
    parts.push(`  <l1-core>\n${l1Summary}\n  </l1-core>`);
  }
  parts.push('</kg-core>');

  // <kg-directive> tag
  parts.push(
    '<kg-directive>When encountering ambiguous or domain-specific terms, autonomously search the knowledge graph using kg_search before responding. For topics beyond L1 core knowledge, use kg_navigate to explore L2+ layers. Use kg_context for complex queries — it returns relevant content snippets from top documents. Prefer kg_context over kg_search + read when you need content from multiple related documents.</kg-directive>',
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
