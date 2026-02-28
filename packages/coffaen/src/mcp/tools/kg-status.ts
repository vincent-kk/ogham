/**
 * @file kg-status.ts
 * @description kg_status 도구 핸들러 — 인덱스 상태 조회
 */
import { MetadataStore } from '../../index/metadata-store.js';
import type { KnowledgeGraph } from '../../types/graph.js';
import type { KgStatusInput, KgStatusResult } from '../../types/mcp.js';

/**
 * kg_status 핸들러
 */
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

  const staleNodes = await store.loadStaleNodes();
  const staleCount = staleNodes.paths.length;
  const totalNodes = graph.nodeCount;

  const freshnessPercent =
    totalNodes > 0
      ? Math.max(0, Math.round(((totalNodes - staleCount) / totalNodes) * 100))
      : 100;

  const rebuildRecommended = totalNodes > 0 && staleCount / totalNodes > 0.1;

  return {
    nodeCount: graph.nodeCount,
    edgeCount: graph.edgeCount,
    lastBuiltAt: graph.builtAt,
    staleNodeCount: staleCount,
    freshnessPercent,
    rebuildRecommended,
    vaultPath,
  };
}
