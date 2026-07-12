/**
 * @file kgStatus.ts
 * @description kg_status 도구 핸들러 — 인덱스 상태 조회
 */
import { MAX_LINK_ORPHAN_PATHS } from '../../../constants/thresholds.js';
import { MetadataStore } from '../../../core/indexer/metadataStore/index.js';
import type { NodeId } from '../../../types/common.js';
import type { KnowledgeGraph } from '../../../types/graph.js';
import type { KgStatusInput, KgStatusResult } from '../../../types/mcp.js';

function collectLinkOrphanStats(graph: KnowledgeGraph): {
  linkOrphanCount: number;
  linkInboundOrphanCount: number;
  linkOutboundOrphanCount: number;
  linkOrphanByLayer: Record<string, number>;
  linkOrphanArchivedCount: number;
  linkOrphanPaths: string[];
} {
  const linkInbound = new Set<NodeId>();
  const linkOutbound = new Set<NodeId>();
  for (const edge of graph.edges) {
    if (edge.type !== 'LINK') continue;
    linkOutbound.add(edge.from);
    linkInbound.add(edge.to);
  }
  let linkInboundOrphanCount = 0;
  let linkOutboundOrphanCount = 0;
  const linkOrphanByLayer: Record<string, number> = {};
  let linkOrphanArchivedCount = 0;
  const linkOrphanPaths: string[] = [];
  for (const [id, node] of graph.nodes) {
    const hasIn = linkInbound.has(id);
    const hasOut = linkOutbound.has(id);
    if (!hasIn) linkInboundOrphanCount++;
    if (!hasOut) linkOutboundOrphanCount++;
    if (hasIn || hasOut) continue;
    const layerKey = String(node.layer);
    linkOrphanByLayer[layerKey] = (linkOrphanByLayer[layerKey] ?? 0) + 1;
    if (node.archived) linkOrphanArchivedCount++;
    linkOrphanPaths.push(node.path);
  }
  linkOrphanPaths.sort();
  return {
    linkOrphanCount: linkOrphanPaths.length,
    linkInboundOrphanCount,
    linkOutboundOrphanCount,
    linkOrphanByLayer,
    linkOrphanArchivedCount,
    linkOrphanPaths,
  };
}

export async function handleKgStatus(
  vaultPath: string,
  graph: KnowledgeGraph | null,
  input: KgStatusInput,
): Promise<KgStatusResult> {
  const store = new MetadataStore(vaultPath);

  if (!graph)
    return {
      nodeCount: 0,
      edgeCount: 0,
      lastBuiltAt: undefined,
      staleNodeCount: 0,
      freshnessPercent: 0,
      rebuildRecommended: true,
      vaultPath,
    };

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
  for (const [, node] of graph.nodes)
    if (node.subLayer)
      subLayerDistribution[node.subLayer] =
        (subLayerDistribution[node.subLayer] ?? 0) + 1;

  // CROSS_LAYER 엣지 수 집계
  let crossLayerEdgeCount = 0;
  for (const edge of graph.edges)
    if (edge.type === 'CROSS_LAYER') crossLayerEdgeCount++;

  if (crossLayerEdgeCount > 0)
    subLayerDistribution['cross_layer_edges'] = crossLayerEdgeCount;

  const orphanStats = collectLinkOrphanStats(graph);

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
    linkOrphanCount: orphanStats.linkOrphanCount,
    linkInboundOrphanCount: orphanStats.linkInboundOrphanCount,
    linkOutboundOrphanCount: orphanStats.linkOutboundOrphanCount,
    linkOrphanByLayer: orphanStats.linkOrphanByLayer,
    linkOrphanArchivedCount: orphanStats.linkOrphanArchivedCount,
    ...(input.include_orphan_paths
      ? {
          linkOrphanPaths: orphanStats.linkOrphanPaths.slice(
            0,
            MAX_LINK_ORPHAN_PATHS,
          ),
        }
      : {}),
  };
}
