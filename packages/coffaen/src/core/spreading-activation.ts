/**
 * @file spreading-activation.ts
 * @description 확산 활성화 엔진 — 시드 노드에서 에너지 확산, 관련 노드 탐색
 *
 * 핵심 수식: A[j] = sum(A[i] * W[i,j] * d)
 * Layer별 감쇠: L1=0.5, L2=0.7, L3=0.8, L4=0.9
 * BFS 방식 홉 확산, 임계값 기반 종료
 */
import type { NodeId } from '../types/common.js';
import type {
  ActivationResult,
  AdjacencyList,
  KnowledgeGraph,
} from '../types/graph.js';

/** Layer별 감쇠 인자 */
const LAYER_DECAY: Record<number, number> = {
  1: 0.5, // L1 Core — 광범위한 확산
  2: 0.7, // L2 Derived — 표준 확산
  3: 0.8, // L3 External — 제한적 확산
  4: 0.9, // L4 Action — 최소 확산
};

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
}

/** BFS 큐 항목 */
interface QueueItem {
  nodeId: NodeId;
  activation: number;
  hops: number;
  path: NodeId[];
}

/**
 * 인접 리스트를 그래프에서 생성
 */
export function buildAdjacencyList(graph: KnowledgeGraph): AdjacencyList {
  const adj: AdjacencyList = new Map();

  for (const nodeId of graph.nodes.keys()) {
    adj.set(nodeId, []);
  }

  for (const edge of graph.edges) {
    const neighbors = adj.get(edge.from) ?? [];
    neighbors.push(edge.to);
    adj.set(edge.from, neighbors);

    // 양방향 링크의 경우 역방향도 추가
    if (edge.type === 'SIBLING') {
      const reverseNeighbors = adj.get(edge.to) ?? [];
      reverseNeighbors.push(edge.from);
      adj.set(edge.to, reverseNeighbors);
    }
  }

  return adj;
}

/**
 * 엣지 가중치 조회 (from → to)
 */
function getEdgeWeight(
  graph: KnowledgeGraph,
  from: NodeId,
  to: NodeId,
): number {
  const edge = graph.edges.find((e) => e.from === from && e.to === to);
  return edge?.weight ?? 0.5; // 기본 가중치
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
  const layer = node.layer as unknown as number;
  return LAYER_DECAY[layer] ?? 0.7;
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
  const {
    threshold = 0.1,
    maxHops = 5,
    maxActiveNodes = 100,
    decayOverride,
  } = params;

  // 활성화 맵: nodeId → 최고 활성화 값
  const activationMap = new Map<NodeId, ActivationResult>();

  // BFS 큐
  const queue: QueueItem[] = [];

  // 시드 노드 초기화 (활성화 값 1.0)
  for (const seedId of seedIds) {
    if (!graph.nodes.has(seedId)) continue;

    const existing = activationMap.get(seedId);
    if (!existing || existing.score < 1.0) {
      activationMap.set(seedId, {
        nodeId: seedId,
        score: 1.0,
        hops: 0,
        path: [seedId],
      });
    }

    queue.push({
      nodeId: seedId,
      activation: 1.0,
      hops: 0,
      path: [seedId],
    });
  }

  // BFS 확산
  while (queue.length > 0 && activationMap.size <= maxActiveNodes) {
    const current = queue.shift()!;

    // 최대 홉 초과 시 확산 중단
    if (current.hops >= maxHops) continue;

    // 현재 노드의 이웃 탐색
    for (const edge of graph.edges) {
      if (edge.from !== current.nodeId) continue;

      const neighborId = edge.to;
      if (!graph.nodes.has(neighborId)) continue;

      // 이미 path에 있는 노드는 건너뜀 (순환 방지)
      if (current.path.includes(neighborId)) continue;

      // A[j] = A[i] * W[i,j] * d
      const decay = getDecayForNode(graph, current.nodeId, decayOverride);
      const weight = getEdgeWeight(graph, current.nodeId, neighborId);
      const newActivation = current.activation * weight * decay;

      // 임계값 미만이면 확산 중단
      if (newActivation < threshold) continue;

      // 최대 1.0으로 캡핑
      const cappedActivation = Math.min(newActivation, 1.0);

      const newPath = [...current.path, neighborId];
      const newHops = current.hops + 1;

      // 기존 활성화보다 높은 경우에만 업데이트
      const existing = activationMap.get(neighborId);
      if (!existing || existing.score < cappedActivation) {
        activationMap.set(neighborId, {
          nodeId: neighborId,
          score: cappedActivation,
          hops: newHops,
          path: newPath,
        });

        // 계속 확산 가능하면 큐에 추가
        if (cappedActivation >= threshold && newHops < maxHops) {
          queue.push({
            nodeId: neighborId,
            activation: cappedActivation,
            hops: newHops,
            path: newPath,
          });
        }
      }
    }
  }

  // score 내림차순 정렬하여 반환
  return Array.from(activationMap.values()).sort((a, b) => b.score - a.score);
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
    return this.activate(graph, [seedId], params);
  }
}
