/**
 * @file weight-calculator.ts
 * @description 엣지 가중치 계산 — P0: 균일 가중치 1.0, Layer별 감쇠, 정규화
 */

import { Layer } from '../types/common.js';
import type { NodeId } from '../types/common.js';
import type { KnowledgeEdge, KnowledgeGraph, KnowledgeNode } from '../types/graph.js';

/** Layer별 기본 감쇠 인자 (확산 활성화용) */
export const LAYER_DECAY_FACTORS: Record<Layer, number> = {
  [Layer.L1_CORE]: 0.5,
  [Layer.L2_DERIVED]: 0.7,
  [Layer.L3_EXTERNAL]: 0.8,
  [Layer.L4_ACTION]: 0.9,
};

/** 가중치 계산 결과 */
export interface WeightCalcResult {
  /** 가중치가 적용된 엣지 목록 */
  edges: KnowledgeEdge[];
  /** 노드별 PageRank 점수 (선택적 계산) */
  pageranks: Map<NodeId, number>;
}

/**
 * 그래프의 모든 엣지 가중치를 계산한다.
 * P0: 균일 가중치 1.0 (Wu-Palmer / SCS는 Phase 1+ 구현)
 * - LINK 엣지: SCS 기반 (P0에서는 1.0)
 * - PARENT_OF / CHILD_OF: Wu-Palmer 기반 (P0에서는 1.0)
 * - SIBLING: Wu-Palmer 기반 (P0에서는 1.0)
 */
export function calculateWeights(graph: KnowledgeGraph): WeightCalcResult {
  const edges = graph.edges.map((edge) => ({
    ...edge,
    weight: computeEdgeWeight(edge, graph),
  }));

  const pageranks = computePageRank(graph);

  return { edges, pageranks };
}

/**
 * 개별 엣지 가중치 계산.
 * P0: 균일 1.0, 향후 Wu-Palmer / SCS로 교체 예정.
 */
function computeEdgeWeight(edge: KnowledgeEdge, graph: KnowledgeGraph): number {
  const fromNode = graph.nodes.get(edge.from);
  const toNode = graph.nodes.get(edge.to);

  if (!fromNode || !toNode) return 1.0;

  switch (edge.type) {
    case 'LINK':
      return computeSCSWeight(fromNode, toNode);
    case 'PARENT_OF':
    case 'CHILD_OF':
    case 'SIBLING':
      return computeWuPalmerWeight(fromNode, toNode);
    default:
      return 1.0;
  }
}

/**
 * Wu-Palmer 유사도 (디렉토리 트리 LCS 깊이 기반).
 * P0: 경로 깊이 차이로 근사. 동일 디렉토리 = 1.0, 멀수록 낮아짐.
 */
function computeWuPalmerWeight(a: KnowledgeNode, b: KnowledgeNode): number {
  const depthA = getPathDepth(a.path);
  const depthB = getPathDepth(b.path);
  const lcsDepth = getLCSDepth(a.path, b.path);

  // Wu-Palmer: 2 * depth(LCS) / (depth(a) + depth(b))
  const denominator = depthA + depthB;
  if (denominator === 0) return 1.0;
  return Math.min(1.0, (2 * lcsDepth) / denominator);
}

/**
 * SCS (Shortest Common Superstring) 기반 가중치.
 * P0: 경로 유사도로 근사. 공통 경로 접두사 길이 기반.
 */
function computeSCSWeight(a: KnowledgeNode, b: KnowledgeNode): number {
  const partsA = a.path.split('/');
  const partsB = b.path.split('/');
  let commonLen = 0;
  const minLen = Math.min(partsA.length, partsB.length);
  for (let i = 0; i < minLen; i++) {
    if (partsA[i] === partsB[i]) commonLen++;
    else break;
  }
  const maxLen = Math.max(partsA.length, partsB.length);
  if (maxLen === 0) return 1.0;
  return Math.min(1.0, commonLen / maxLen);
}

/**
 * PageRank 계산 (단순 반복법).
 * 수렴 기준: 변화량 < 1e-6 또는 최대 100회 반복.
 */
export function computePageRank(
  graph: KnowledgeGraph,
  dampingFactor = 0.85,
  maxIterations = 100,
  tolerance = 1e-6,
): Map<NodeId, number> {
  const nodeIds = Array.from(graph.nodes.keys());
  const n = nodeIds.length;
  if (n === 0) return new Map();

  const ranks = new Map<NodeId, number>();
  const initialRank = 1.0 / n;
  for (const id of nodeIds) {
    ranks.set(id, initialRank);
  }

  // 아웃디그리 계산
  const outDegree = new Map<NodeId, number>();
  for (const id of nodeIds) {
    outDegree.set(id, 0);
  }
  for (const edge of graph.edges) {
    if (edge.type === 'LINK' || edge.type === 'PARENT_OF') {
      outDegree.set(edge.from, (outDegree.get(edge.from) ?? 0) + 1);
    }
  }

  // 인바운드 엣지 맵 구성
  const inbound = new Map<NodeId, Array<{ from: NodeId; weight: number }>>();
  for (const id of nodeIds) {
    inbound.set(id, []);
  }
  for (const edge of graph.edges) {
    if (edge.type === 'LINK' || edge.type === 'PARENT_OF') {
      inbound.get(edge.to)?.push({ from: edge.from, weight: edge.weight });
    }
  }

  // Dangling node 목록 (outDegree === 0)
  const danglingNodes = nodeIds.filter((id) => (outDegree.get(id) ?? 0) === 0);

  for (let iter = 0; iter < maxIterations; iter++) {
    const newRanks = new Map<NodeId, number>();
    let maxDelta = 0;

    // Dangling node rank 합산 → 모든 노드에 균등 분배
    let danglingSum = 0;
    for (const id of danglingNodes) {
      danglingSum += ranks.get(id) ?? 0;
    }

    for (const id of nodeIds) {
      let rank =
        (1 - dampingFactor) / n + (dampingFactor * danglingSum) / n;
      const sources = inbound.get(id) ?? [];
      for (const { from, weight } of sources) {
        const fromDegree = outDegree.get(from) ?? 1;
        rank += dampingFactor * (ranks.get(from) ?? 0) * (weight / fromDegree);
      }
      newRanks.set(id, rank);
      maxDelta = Math.max(maxDelta, Math.abs(rank - (ranks.get(id) ?? 0)));
    }

    for (const [id, r] of newRanks) {
      ranks.set(id, r);
    }

    if (maxDelta < tolerance) break;
  }

  return ranks;
}

/**
 * 가중치 정규화: 모든 엣지 가중치를 [0, 1] 범위로 정규화.
 */
export function normalizeWeights(edges: KnowledgeEdge[]): KnowledgeEdge[] {
  if (edges.length === 0) return edges;
  const maxWeight = Math.max(...edges.map((e) => e.weight));
  if (maxWeight === 0) return edges;
  return edges.map((e) => ({ ...e, weight: e.weight / maxWeight }));
}

/**
 * Layer별 감쇠 인자 반환.
 */
export function getLayerDecay(layer: Layer): number {
  return LAYER_DECAY_FACTORS[layer] ?? 0.7;
}

/** 파일 경로 깊이 계산 */
function getPathDepth(filePath: string): number {
  return filePath.split('/').length;
}

/** 두 경로의 LCS(최장 공통 접두사) 깊이 계산 */
function getLCSDepth(pathA: string, pathB: string): number {
  const partsA = pathA.split('/');
  const partsB = pathB.split('/');
  let lcs = 0;
  const minLen = Math.min(partsA.length, partsB.length);
  for (let i = 0; i < minLen; i++) {
    if (partsA[i] === partsB[i]) lcs++;
    else break;
  }
  return lcs;
}
