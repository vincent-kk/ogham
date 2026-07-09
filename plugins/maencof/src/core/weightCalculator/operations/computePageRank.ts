/**
 * @file computePageRank.ts
 * @description PageRank 계산 (단순 반복법).
 */
import type { NodeId } from '../../../types/common.js';
import type { KnowledgeGraph } from '../../../types/graph.js';

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
  for (const id of danglingNodes) danglingSum += ranks.get(id) ?? 0;

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

    for (const [id, r] of newRanks) ranks.set(id, r);

    if (checkConvergence(maxDelta, tolerance)) break;
  }

  return ranks;
}
