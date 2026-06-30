/**
 * @file kgStatus.ts
 * @description kg_status 도구 핸들러 — 인덱스 상태 조회
 */
import { MetadataStore } from '../../../core/indexer/metadataStore/index.js';
import type { NodeId } from '../../../types/common.js';
import type { KnowledgeGraph } from '../../../types/graph.js';
import type { KgStatusInput, KgStatusResult } from '../../../types/mcp.js';

function collectLinkOrphanStats(graph: KnowledgeGraph): {
  linkOrphanCount: number;
  linkInboundOrphanCount: number;
  linkOutboundOrphanCount: number;
} {
  const linkInbound = new Set<NodeId>();
  const linkOutbound = new Set<NodeId>();
  for (const edge of graph.edges) {
    if (edge.type !== 'LINK') continue;
    linkOutbound.add(edge.from);
    linkInbound.add(edge.to);
  }
  let linkOrphanCount = 0;
  let linkInboundOrphanCount = 0;
  let linkOutboundOrphanCount = 0;
  for (const id of graph.nodes.keys()) {
    const hasIn = linkInbound.has(id);
    const hasOut = linkOutbound.has(id);
    if (!hasIn && !hasOut) linkOrphanCount++;
    if (!hasIn) linkInboundOrphanCount++;
    if (!hasOut) linkOutboundOrphanCount++;
  }
  return { linkOrphanCount, linkInboundOrphanCount, linkOutboundOrphanCount };
}

export async function handleKgStatus(
  vaultPath: string,
  graph: KnowledgeGraph | null,
  _input: KgStatusInput,
): Promise<KgStatusResult> {
  const store = new MetadataStore(vaultPath);

  if (!graph) {
    return {
      nodeCount: 0,
      edgeCount: 0,
      lastBuiltAt: undefined,
      staleNodeCount: 0,
      freshnessPercent: 0,
      rebuildRecommended: true,
      vaultPath,
    };
  }

  const staleNodes = await store.loadStaleEntries();
  const staleCount = staleNodes.entries.length;
  const totalNodes = graph.nodeCount;

  const freshnessPercent =
    totalNodes > 0
      ? Math.max(0, Math.round(((totalNodes - staleCount) / totalNodes) * 100))
      : 100;

  const rebuildRecommended = totalNodes > 0 && staleCount / totalNodes > 0.1;

  // Sub-layer 분포 집계
  const subLayerDistribution: Record<string, number> = {};
  for (const [, node] of graph.nodes) {
    if (node.subLayer) {
      subLayerDistribution[node.subLayer] =
        (subLayerDistribution[node.subLayer] ?? 0) + 1;
    }
  }

  // CROSS_LAYER 엣지 수 집계
  let crossLayerEdgeCount = 0;
  for (const edge of graph.edges) {
    if (edge.type === 'CROSS_LAYER') crossLayerEdgeCount++;
  }

  if (crossLayerEdgeCount > 0) {
    subLayerDistribution['cross_layer_edges'] = crossLayerEdgeCount;
  }

  const { linkOrphanCount, linkInboundOrphanCount, linkOutboundOrphanCount } =
    collectLinkOrphanStats(graph);

  return {
    nodeCount: graph.nodeCount,
    edgeCount: graph.edgeCount,
    lastBuiltAt: graph.builtAt,
    staleNodeCount: staleCount,
    freshnessPercent,
    rebuildRecommended,
    vaultPath,
    subLayerDistribution:
      Object.keys(subLayerDistribution).length > 0
        ? subLayerDistribution
        : undefined,
    linkOrphanCount,
    linkInboundOrphanCount,
    linkOutboundOrphanCount,
  };
}
