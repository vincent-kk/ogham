/**
 * @file weight-calculator.ts
 * @description 엣지 가중치 계산 — P0: 균일 가중치 1.0, Layer별 감쇠, 정규화
 */
import { Layer } from '../types/common.js';
import type { NodeId, SubLayer } from '../types/common.js';
import type {
  KnowledgeEdge,
  KnowledgeGraph,
  KnowledgeNode,
} from '../types/graph.js';

/** Layer별 기본 감쇠 인자 (확산 활성화용) */
export const LAYER_DECAY_FACTORS: Record<Layer, number> = {
  [Layer.L1_CORE]: 0.5,
  [Layer.L2_DERIVED]: 0.7,
  [Layer.L3_EXTERNAL]: 0.8,
  [Layer.L4_ACTION]: 0.9,
  [Layer.L5_CONTEXT]: 0.95,
};

/** 서브레이어별 감쇠 인자 */
export const SUBLAYER_DECAY_FACTORS: Record<SubLayer, number> = {
  relational: 0.75,
  structural: 0.8,
  topical: 0.85,
  buffer: 0.95,
  boundary: 0.6,
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
    case 'RELATIONSHIP':
      return computeRelationshipWeight(fromNode, toNode);
    case 'CROSS_LAYER':
      return 1.0;
    case 'DOMAIN':
      return 0.3;
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
 * RELATIONSHIP 엣지 가중치 계산.
 * intimacy_level 1-5 → 0.2-1.0 선형 매핑: 0.2 + (avg - 1) * 0.2
 */
function computeRelationshipWeight(a: KnowledgeNode, b: KnowledgeNode): number {
  const aExt = a as KnowledgeNode & { person?: { intimacy_level?: number } };
  const bExt = b as KnowledgeNode & { person?: { intimacy_level?: number } };
  const levelA = aExt.person?.intimacy_level ?? 3;
  const levelB = bExt.person?.intimacy_level ?? 3;
  const avg = (levelA + levelB) / 2;
  return Math.min(1.0, 0.2 + (avg - 1) * 0.2);
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

/** PageRank 초기화 결과 */
interface PageRankInit {
  nodeIds: NodeId[];
  ranks: Map<NodeId, number>;
  outDegree: Map<NodeId, number>;
  inbound: Map<NodeId, Array<{ from: NodeId; weight: number }>>;
  danglingNodes: NodeId[];
}

/** PageRank용 엣지 타입 필터 */
function isPageRankEdge(edgeType: string): boolean {
  return (
    edgeType === 'LINK' ||
    edgeType === 'PARENT_OF' ||
    edgeType === 'RELATIONSHIP'
  );
}

/**
 * PageRank 초기 상태(랭크 벡터, 아웃디그리, 인바운드 맵)를 구성한다.
 */
function initializePageRank(graph: KnowledgeGraph): PageRankInit {
  const nodeIds = Array.from(graph.nodes.keys());
  const n = nodeIds.length;
  const initialRank = 1.0 / n;

  const ranks = new Map<NodeId, number>();
  const outDegree = new Map<NodeId, number>();
  const inbound = new Map<NodeId, Array<{ from: NodeId; weight: number }>>();

  for (const id of nodeIds) {
    ranks.set(id, initialRank);
    outDegree.set(id, 0);
    inbound.set(id, []);
  }

  for (const edge of graph.edges) {
    if (!isPageRankEdge(edge.type)) continue;
    outDegree.set(edge.from, (outDegree.get(edge.from) ?? 0) + 1);
    inbound.get(edge.to)?.push({ from: edge.from, weight: edge.weight });
  }

  const danglingNodes = nodeIds.filter((id) => (outDegree.get(id) ?? 0) === 0);

  return { nodeIds, ranks, outDegree, inbound, danglingNodes };
}

/**
 * PageRank 단일 반복 스텝을 수행하고, 새 랭크 맵과 최대 변화량을 반환한다.
 */
function iteratePageRank(
  nodeIds: NodeId[],
  ranks: Map<NodeId, number>,
  outDegree: Map<NodeId, number>,
  inbound: Map<NodeId, Array<{ from: NodeId; weight: number }>>,
  danglingNodes: NodeId[],
  dampingFactor: number,
): { newRanks: Map<NodeId, number>; maxDelta: number } {
  const n = nodeIds.length;
  const newRanks = new Map<NodeId, number>();
  let maxDelta = 0;

  // Dangling node rank 합산 → 모든 노드에 균등 분배
  let danglingSum = 0;
  for (const id of danglingNodes) {
    danglingSum += ranks.get(id) ?? 0;
  }

  for (const id of nodeIds) {
    let rank = (1 - dampingFactor) / n + (dampingFactor * danglingSum) / n;
    const sources = inbound.get(id) ?? [];
    for (const { from, weight } of sources) {
      const fromDegree = outDegree.get(from) ?? 1;
      rank += dampingFactor * (ranks.get(from) ?? 0) * (weight / fromDegree);
    }
    newRanks.set(id, rank);
    maxDelta = Math.max(maxDelta, Math.abs(rank - (ranks.get(id) ?? 0)));
  }

  return { newRanks, maxDelta };
}

/**
 * 이전/현재 랭크 맵의 수렴 여부를 판정한다.
 * maxDelta < tolerance 이면 수렴으로 간주한다.
 */
function checkConvergence(maxDelta: number, tolerance: number): boolean {
  return maxDelta < tolerance;
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
  const { nodeIds, ranks, outDegree, inbound, danglingNodes } =
    initializePageRank(graph);

  if (nodeIds.length === 0) return new Map();

  for (let iter = 0; iter < maxIterations; iter++) {
    const { newRanks, maxDelta } = iteratePageRank(
      nodeIds,
      ranks,
      outDegree,
      inbound,
      danglingNodes,
      dampingFactor,
    );

    for (const [id, r] of newRanks) {
      ranks.set(id, r);
    }

    if (checkConvergence(maxDelta, tolerance)) break;
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
 * Layer별 감쇠 인자 반환. 서브레이어 지정 시 서브레이어 감쇠 사용.
 */
export function getLayerDecay(layer: Layer, subLayer?: SubLayer): number {
  if (subLayer && subLayer in SUBLAYER_DECAY_FACTORS) {
    return SUBLAYER_DECAY_FACTORS[subLayer];
  }
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
