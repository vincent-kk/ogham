/**
 * @file spreadingActivation.ts
 * @description 확산 활성화 엔진 — 시드 노드에서 에너지 확산, 관련 노드 탐색
 *
 * 핵심 수식: A[j] = sum(A[i] * W[i,j] * d)
 * Layer별 감쇠: L1=0.5, L2=0.7, L3=0.8, L4=0.9, L5=0.95
 * BFS 방식 홉 확산, 임계값 기반 종료
 */
import { EDGE_TYPE_MULTIPLIER } from '../../constants/spreadingActivation.js';
import type { EdgeType, NodeId } from '../../types/common.js';
import type {
  ActivationResult,
  AdjacencyList,
  KnowledgeGraph,
} from '../../types/graph.js';
import { buildAdjacencyList } from '../graphBuilder/index.js';
import { getLayerDecay } from '../weightCalculator/index.js';

export { EDGE_TYPE_MULTIPLIER };

/** 확산 활성화 파라미터 */
export interface SpreadingActivationParams {
  /** 발화 임계값 — 이 값 이상일 때만 확산 (기본: 0.1) */
  threshold?: number;
  /** 최대 홉 수 (기본: 5) */
  maxHops?: number;
  /** 최대 활성 노드 수 (기본: 100) */
  maxActiveNodes?: number;
  /** 감쇠 인자 오버라이드 (기본: Layer별 감쇠 사용) */
  decayOverride?: number;
  /** 시드별 초기 활성화 값 (미지정 시 1.0) */
  seedActivations?: Map<NodeId, number>;
  /**
   * 노드별 SIBLING(폴더-형제) 확산 fanout 상한 (미지정/Infinity = 무제한).
   * 대형 폴더 클리크가 균일 점수로 결과를 도배하는 것을 막기 위해, 형제 이웃은 pagerank 상위
   * K개만 전파한다. LINK/계층 등 의미 엣지는 제한하지 않는다.
   */
  siblingFanoutCap?: number;
}

/** BFS 큐 항목 */
interface QueueItem {
  nodeId: NodeId;
  activation: number;
  hops: number;
  path: NodeId[];
}

/**
 * 엣지 타입 조회 (from → to)
 * edgeTypeMap이 있으면 O(1), 없으면 edges.find() 폴백
 */
function getEdgeType(
  graph: KnowledgeGraph,
  from: NodeId,
  to: NodeId,
): EdgeType {
  if (graph.edgeTypeMap) {
    return graph.edgeTypeMap.get(from)?.get(to) ?? 'LINK';
  }
  const edge = graph.edges.find((e) => e.from === from && e.to === to);
  return edge?.type ?? 'LINK';
}

/**
 * 엣지 가중치 조회 (from → to)
 * 기본 가중치에 엣지 타입별 멀티플라이어를 적용한다.
 * edgeWeightMap이 있으면 O(1), 없으면 edges.find() 폴백
 */
function getEdgeWeight(
  graph: KnowledgeGraph,
  from: NodeId,
  to: NodeId,
): number {
  const baseWeight = graph.edgeWeightMap
    ? (graph.edgeWeightMap.get(from)?.get(to) ?? 0.5)
    : (graph.edges.find((e) => e.from === from && e.to === to)?.weight ?? 0.5);

  const edgeType = getEdgeType(graph, from, to);
  return baseWeight * EDGE_TYPE_MULTIPLIER[edgeType];
}

/**
 * 노드의 Layer에 따른 감쇠 인자 반환
 */
function getDecayForNode(
  graph: KnowledgeGraph,
  nodeId: NodeId,
  decayOverride?: number,
): number {
  if (decayOverride !== undefined) return decayOverride;
  const node = graph.nodes.get(nodeId);
  if (!node) return 0.7;
  return getLayerDecay(node.layer, node.subLayer);
}

/**
 * 노드의 이웃 목록에 SIBLING fanout 상한을 적용한다.
 * 형제 이웃이 상한을 초과하면 pagerank 상위 K개만 남기고(동률은 id 사전순), 비-형제 이웃은
 * 모두 보존한다. 상한이 무한이거나 전체 이웃이 상한 이하이면 원본 순서를 그대로 반환한다.
 */
function capSiblingFanout(
  graph: KnowledgeGraph,
  from: NodeId,
  neighbors: NodeId[],
  cap: number,
): NodeId[] {
  if (!Number.isFinite(cap) || neighbors.length <= cap) return neighbors;

  const siblings: NodeId[] = [];
  const others: NodeId[] = [];
  for (const to of neighbors) {
    if (getEdgeType(graph, from, to) === 'SIBLING') siblings.push(to);
    else others.push(to);
  }
  if (siblings.length <= cap) return neighbors;

  siblings.sort((a, b) => {
    const pa = graph.nodes.get(a)?.pagerank ?? 0;
    const pb = graph.nodes.get(b)?.pagerank ?? 0;
    if (pb !== pa) return pb - pa;
    return a < b ? -1 : a > b ? 1 : 0;
  });
  return [...others, ...siblings.slice(0, cap)];
}

/**
 * 단일 이웃 노드에 대한 활성화 확산 처리.
 * - 홉 한도, 순환 방지, 임계값 체크, 활성화 맵 업데이트, 큐 추가를 담당한다.
 */
function processNeighbor(
  graph: KnowledgeGraph,
  current: QueueItem,
  neighborId: NodeId,
  params: {
    threshold: number;
    maxHops: number;
    maxActiveNodes: number;
    decayOverride: number | undefined;
  },
  activationMap: Map<NodeId, ActivationResult>,
  queue: QueueItem[],
): void {
  const { threshold, maxHops, decayOverride } = params;

  if (!graph.nodes.has(neighborId)) return;

  // 순환 방지
  if (current.path.includes(neighborId)) return;

  // A[j] = A[i] * W[i,j] * d
  const decay = getDecayForNode(graph, current.nodeId, decayOverride);
  const weight = getEdgeWeight(graph, current.nodeId, neighborId);
  const newActivation = current.activation * weight * decay;

  // 임계값 미만이면 확산 중단
  if (newActivation < threshold) return;

  const cappedActivation = Math.min(newActivation, 1.0);
  const newPath = [...current.path, neighborId];
  const newHops = current.hops + 1;

  // 기존 활성화보다 높은 경우에만 업데이트
  const existing = activationMap.get(neighborId);
  if (existing && existing.score >= cappedActivation) return;

  activationMap.set(neighborId, {
    nodeId: neighborId,
    score: cappedActivation,
    hops: newHops,
    path: newPath,
  });

  // 계속 확산 가능하면 큐에 추가
  if (newHops < maxHops) {
    queue.push({
      nodeId: neighborId,
      activation: cappedActivation,
      hops: newHops,
      path: newPath,
    });
  }
}

/**
 * 확산 활성화 실행
 *
 * @param graph - 지식 그래프
 * @param seedIds - 시드 노드 ID 목록 (초기 활성화 1.0)
 * @param params - 파라미터
 * @returns 활성화된 노드 목록 (score 내림차순 정렬)
 */
export function runSpreadingActivation(
  graph: KnowledgeGraph,
  seedIds: NodeId[],
  params: SpreadingActivationParams = {},
): ActivationResult[] {
  const threshold = params.threshold ?? 0.1;
  const maxHops = params.maxHops ?? 5;
  const maxActiveNodes = params.maxActiveNodes ?? 100;
  const decayOverride = params.decayOverride;
  const seedActivations = params.seedActivations;
  const siblingFanoutCap = params.siblingFanoutCap ?? Infinity;
  const resolvedParams = {
    threshold,
    maxHops,
    maxActiveNodes,
    decayOverride,
    seedActivations,
  };

  // 활성화 맵: nodeId → 최고 활성화 값
  const activationMap = new Map<NodeId, ActivationResult>();

  // BFS 큐
  const queue: QueueItem[] = [];

  // 시드 노드 초기화 (seedActivations 맵이 있으면 해당 값, 없으면 1.0)
  for (const seedId of seedIds) {
    if (!graph.nodes.has(seedId)) continue;

    const seedScore = resolvedParams.seedActivations?.get(seedId) ?? 1.0;
    const existing = activationMap.get(seedId);
    if (!existing || existing.score < seedScore) {
      activationMap.set(seedId, {
        nodeId: seedId,
        score: seedScore,
        hops: 0,
        path: [seedId],
      });
    }

    queue.push({
      nodeId: seedId,
      activation: seedScore,
      hops: 0,
      path: [seedId],
    });
  }

  // 인접 리스트 획득: 사전 계산된 것이 있으면 사용, 없으면 폴백 빌드
  const adj: AdjacencyList =
    graph.adjacencyList ?? buildAdjacencyList(graph.nodes, graph.edges);

  // BFS 확산 (index pointer 방식 — shift() 대신 O(1) 접근)
  let queueHead = 0;
  while (queueHead < queue.length && activationMap.size <= maxActiveNodes) {
    const current = queue[queueHead++]!;

    // 최대 홉 초과 시 확산 중단
    if (current.hops >= maxHops) continue;

    // 인접 리스트에서 이웃 탐색 (O(degree) — 기존 O(E) 대비 최적화)
    const neighbors = adj.get(current.nodeId);
    if (neighbors) {
      const ordered = capSiblingFanout(
        graph,
        current.nodeId,
        neighbors,
        siblingFanoutCap,
      );
      for (const neighborId of ordered) {
        processNeighbor(
          graph,
          current,
          neighborId,
          resolvedParams,
          activationMap,
          queue,
        );
      }
    }
  }

  // score 내림차순 정렬, 동률은 pagerank 우선 (균일 점수 형제 클리크의 랭킹 붕괴 방지)
  return Array.from(activationMap.values()).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const pa = graph.nodes.get(a.nodeId)?.pagerank ?? 0;
    const pb = graph.nodes.get(b.nodeId)?.pagerank ?? 0;
    return pb - pa;
  });
}

/**
 * 확산 활성화 엔진 클래스 (상태 보관 없음 — 순수 함수 래퍼)
 */
export class SpreadingActivationEngine {
  private readonly defaultParams: SpreadingActivationParams;

  constructor(defaultParams: SpreadingActivationParams = {}) {
    this.defaultParams = defaultParams;
  }

  /**
   * 활성화 실행
   */
  activate(
    graph: KnowledgeGraph,
    seedIds: NodeId[],
    params?: SpreadingActivationParams,
  ): ActivationResult[] {
    return runSpreadingActivation(graph, seedIds, {
      ...this.defaultParams,
      ...params,
    });
  }

  /**
   * 단일 시드로 활성화
   */
  activateFrom(
    graph: KnowledgeGraph,
    seedId: NodeId,
    params?: SpreadingActivationParams,
  ): ActivationResult[] {
    return runSpreadingActivation(graph, [seedId], {
      ...this.defaultParams,
      ...params,
    });
  }
}
