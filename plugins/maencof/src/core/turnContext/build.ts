/**
 * @file build.ts
 * @description Build the compressed XML turn context. stale 정보는 인덱서 내부 상태로 격리되어 노출하지 않는다.
 */
import type { PinnedNode } from '../cacheManager/cacheManager.js';
import { readPinnedNodes } from '../cacheManager/cacheManager.js';

import { buildCompanionIdentityTag } from './buildCompanionIdentityTag.js';
import { readCompanionIdentity } from './readCompanionIdentity.js';
import { readIndexMetadata } from './readIndexMetadata.js';
import { readL1NodesSummary } from './readL1Summary.js';

function formatLayerCounts(layerCounts: Record<number, number>): string {
  return [1, 2, 3, 4, 5].map((l) => `L${l}:${layerCounts[l] ?? 0}`).join(',');
}

function formatPinnedNodes(nodes: PinnedNode[]): string {
  return nodes.map((n) => n.title).join(',');
}

/**
 * Compressed XML turn-context 문자열을 생성한다.
 * 모든 출력은 영문이며, stale-node나 advisory 분기는 포함하지 않는다.
 */
export function buildTurnContext(cwd: string): string {
  const { totalNodes, layerCounts } = readIndexMetadata(cwd);
  const identity = readCompanionIdentity(cwd);
  const pinnedNodes = readPinnedNodes(cwd);

  const vaultAttr = identity ? ` vault="${identity.name}"` : '';
  const pinnedText = formatPinnedNodes(pinnedNodes);

  const parts: string[] = [];

  if (identity) parts.push(buildCompanionIdentityTag(identity));

  parts.push(
    `<kg-core${vaultAttr} nodes="${totalNodes}" layers="${formatLayerCounts(layerCounts)}">`,
  );
  parts.push(`  <pinned>${pinnedText}</pinned>`);
  const l1Summary = readL1NodesSummary(cwd);
  if (l1Summary) parts.push(`  <l1-core>\n${l1Summary}\n  </l1-core>`);

  parts.push('</kg-core>');

  parts.push(
    '<kg-directive>When encountering ambiguous or domain-specific terms, autonomously search the knowledge graph using kg_search before responding. For topics beyond L1 core knowledge, use kg_navigate to explore L2+ layers. Use kg_context for complex queries — it returns relevant content snippets from top documents. Prefer kg_context over kg_search + read when you need content from multiple related documents.</kg-directive>',
  );

  return parts.join('\n');
}
