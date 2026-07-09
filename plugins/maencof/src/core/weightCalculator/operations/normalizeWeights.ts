/**
 * @file normalizeWeights.ts
 * @description 가중치 정규화 — 모든 엣지 가중치를 [0, 1] 범위로 정규화.
 */
import type { KnowledgeEdge } from '../../../types/graph.js';

/**
 * 가중치 정규화: 모든 엣지 가중치를 [0, 1] 범위로 정규화.
 */
export function normalizeWeights(edges: KnowledgeEdge[]): KnowledgeEdge[] {
  if (edges.length === 0) return edges;
  const maxWeight = Math.max(...edges.map((e) => e.weight));
  if (maxWeight === 0) return edges;
  return edges.map((e) => ({ ...e, weight: e.weight / maxWeight }));
}
