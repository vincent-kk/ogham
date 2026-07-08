/**
 * @file accumulativeActivation.ts
 * @description QGA-SA(Query-Gated Accumulative Spreading Activation) — v2 확산 엔진.
 *
 * 갱신식: Δa(j) = g(j,Q) · Σ_{i∈N⁻(j)} a(i)·α(i)·Ŵ(i,j),  a(j) ← min(1, a(j)+Δa(j))
 *   Ŵ(i,j) = W(i,j)·mult(type)/deg_out(i)  — 차수 정규화 (허브 확산의 원리적 억제)
 *   g(j,Q)  = γ + (1−γ)·|tokens(j)∩Q|/|Q|  — 무임베딩 lexical 게이트 (query-blindness 해소)
 *   α(i)    = α_base·layerDecay(i)          — 5-Layer 감쇠 의미론 유지
 *
 * v1(spreadingActivation.ts)은 성능지표 비교 기준선 하드카피로 동결 — 본 파일은 v1과
 * 코드를 공유하지 않는 자체 완결 구현이다(엣지 조회 중복은 의도된 격리).
 * 설계: .metadata/maencof/TOOL/Query-Gated-Accumulative-Spreading-Activation/01
 */
import {
  EDGE_TYPE_MULTIPLIER,
  QGA_GATE_FLOOR,
  QGA_ITERATIONS,
  QGA_LINK_WEIGHT_FLOOR,
  QGA_UPDATE_THRESHOLD,
} from '../../constants/spreadingActivation.js';
import type { EdgeType, NodeId } from '../../types/common.js';
import type {
  ActivationResult,
  AdjacencyList,
  KnowledgeGraph,
} from '../../types/graph.js';
import {
  buildAdjacencyList,
  tokenizeForInvertedIndex,
} from '../graphBuilder/index.js';
import { getLayerDecay } from '../weightCalculator/index.js';

/** QGA-SA 파라미터 */
export interface AccumulativeActivationParams {
  /** 동기 반복 횟수 T (기본: 3) */
  iterations?: number;
  /** 갱신 임계값 τ — 게이트 적용 후 Δ가 미만이면 반영하지 않음 (기본: 0.01) */
  updateThreshold?: number;
  /** lexical 게이트 하한 γ — 어휘 비중첩 노드의 구조 탐색 보존 (기본: 0.3) */
  gateFloor?: number;
  /** 전역 감쇠 스케일 α_base — layer 감쇠에 곱해짐 (기본: 1.0) */
  alphaBase?: number;
  /** 최대 활성 노드 수 (기본: 100) */
  maxActiveNodes?: number;
  /** 쿼리 토큰 (lowercase) — 비어 있으면 게이트 비활성(전부 1.0) */
  queryTokens?: string[];
  /** 시드별 초기 활성화 값 (미지정 시 1.0) */
  seedActivations?: Map<NodeId, number>;
}

/**
 * (from→to) 엣지 타입 조회. edgeTypeMap이 있으면 O(1), 없으면 edges 폴백.
 */
function edgeTypeOf(graph: KnowledgeGraph, from: NodeId, to: NodeId): EdgeType {
  if (graph.edgeTypeMap) return graph.edgeTypeMap.get(from)?.get(to) ?? 'LINK';

  const edge = graph.edges.find((e) => e.from === from && e.to === to);
  return edge?.type ?? 'LINK';
}

/**
 * (from→to) 유효 가중치 = base·mult(type), LINK는 하한 QGA_LINK_WEIGHT_FLOOR 보장.
 * 하한 근거: SCS 경로 근사는 cross-folder wikilink를 0으로 만들지만, 사용자가 직접
 * 작성한 링크는 최강 신호이므로 폴더 거리와 무관하게 전파되어야 한다.
 */
function effectiveEdgeWeight(
  graph: KnowledgeGraph,
  from: NodeId,
  to: NodeId,
): number {
  const base = graph.edgeWeightMap
    ? (graph.edgeWeightMap.get(from)?.get(to) ?? 0.5)
    : (graph.edges.find((e) => e.from === from && e.to === to)?.weight ?? 0.5);

  const type = edgeTypeOf(graph, from, to);
  const floored =
    type === 'LINK' ? Math.max(base, QGA_LINK_WEIGHT_FLOOR) : base;
  return floored * EDGE_TYPE_MULTIPLIER[type];
}

/** 노드의 layer/subLayer 감쇠 (노드 부재 시 0.7) */
function nodeDecay(graph: KnowledgeGraph, nodeId: NodeId): number {
  const node = graph.nodes.get(nodeId);
  if (!node) return 0.7;
  return getLayerDecay(node.layer, node.subLayer);
}

/**
 * lexical 게이트 g(j,Q). 쿼리 토큰이 없으면 1.0 (게이트 비활성).
 * 노드 토큰은 invertedIndex와 동일한 토큰화를 재사용해 drift를 차단한다.
 */
function gateOf(
  graph: KnowledgeGraph,
  nodeId: NodeId,
  queryTokens: string[],
  floor: number,
  cache: Map<NodeId, number>,
): number {
  if (queryTokens.length === 0) return 1;

  const cached = cache.get(nodeId);
  if (cached !== undefined) return cached;

  const node = graph.nodes.get(nodeId);
  let value = floor;
  if (node) {
    const tokens = new Set(tokenizeForInvertedIndex(node));
    let hits = 0;
    for (const token of queryTokens) if (tokens.has(token)) hits++;

    value = floor + (1 - floor) * (hits / queryTokens.length);
  }
  cache.set(nodeId, value);
  return value;
}

/** 활성 노드 수가 상한을 넘으면 최저 활성 노드부터 결정적으로 제거 (시드는 보존) */
function evictLowest(
  activation: Map<NodeId, number>,
  seedSet: Set<NodeId>,
  maxActiveNodes: number,
): void {
  if (activation.size <= maxActiveNodes) return;

  const evictable = Array.from(activation.entries())
    .filter(([id]) => !seedSet.has(id))
    .sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1));

  let excess = activation.size - maxActiveNodes;
  for (const [id] of evictable) {
    if (excess <= 0) break;
    activation.delete(id);
    excess--;
  }
}

/** 최강 기여 경로 복원 (bestParent 체인 → 시드까지) */
function buildPath(
  nodeId: NodeId,
  bestParent: Map<NodeId, NodeId>,
  firstReach: Map<NodeId, number>,
): NodeId[] {
  if (firstReach.get(nodeId) === 0) return [nodeId];

  const path: NodeId[] = [nodeId];
  const visited = new Set<NodeId>([nodeId]);
  let current = nodeId;
  while (path.length <= 10) {
    const parent = bestParent.get(current);
    if (!parent || visited.has(parent)) break;
    path.unshift(parent);
    visited.add(parent);
    current = parent;
    if (firstReach.get(current) === 0) break;
  }
  return path;
}

/**
 * QGA-SA 실행.
 *
 * @param graph - 지식 그래프 (사전 계산된 조회 맵 활용)
 * @param seedIds - 시드 노드 ID 목록
 * @param params - 파라미터
 * @returns 활성화 노드 목록 (score 내림차순, 동률은 firstReach → id)
 */
export function runAccumulativeActivation(
  graph: KnowledgeGraph,
  seedIds: NodeId[],
  params: AccumulativeActivationParams = {},
): ActivationResult[] {
  const iterations = params.iterations ?? QGA_ITERATIONS;
  const updateThreshold = params.updateThreshold ?? QGA_UPDATE_THRESHOLD;
  const gateFloor = params.gateFloor ?? QGA_GATE_FLOOR;
  const alphaBase = params.alphaBase ?? 1.0;
  const maxActiveNodes = params.maxActiveNodes ?? 100;
  const queryTokens = params.queryTokens ?? [];

  const adj: AdjacencyList =
    graph.adjacencyList ?? buildAdjacencyList(graph.nodes, graph.edges);

  const activation = new Map<NodeId, number>();
  const firstReach = new Map<NodeId, number>();
  const bestParent = new Map<NodeId, NodeId>();
  const bestContribution = new Map<NodeId, number>();
  const gateCache = new Map<NodeId, number>();
  const seedSet = new Set<NodeId>();

  for (const seedId of seedIds) {
    if (!graph.nodes.has(seedId)) continue;
    const seedScore = Math.min(1, params.seedActivations?.get(seedId) ?? 1.0);
    if (seedScore > (activation.get(seedId) ?? 0))
      activation.set(seedId, seedScore);

    firstReach.set(seedId, 0);
    seedSet.add(seedId);
  }

  for (let t = 1; t <= iterations; t++) {
    const delta = new Map<NodeId, number>();

    for (const [from, score] of activation) {
      const neighbors = adj.get(from);
      if (!neighbors || neighbors.length === 0) continue;

      const outMass =
        (score * alphaBase * nodeDecay(graph, from)) / neighbors.length;
      if (outMass <= 0) continue;

      for (const to of neighbors) {
        const contribution = outMass * effectiveEdgeWeight(graph, from, to);
        if (contribution <= 0) continue;
        delta.set(to, (delta.get(to) ?? 0) + contribution);
        if (contribution > (bestContribution.get(to) ?? 0)) {
          bestContribution.set(to, contribution);
          bestParent.set(to, from);
        }
      }
    }

    let changed = false;
    for (const [nodeId, rawDelta] of delta) {
      const gated =
        rawDelta * gateOf(graph, nodeId, queryTokens, gateFloor, gateCache);
      if (gated < updateThreshold) continue;

      const previous = activation.get(nodeId) ?? 0;
      const next = Math.min(1, previous + gated);
      if (next <= previous) continue;

      activation.set(nodeId, next);
      if (!firstReach.has(nodeId)) firstReach.set(nodeId, t);
      changed = true;
    }

    if (!changed) break;
    evictLowest(activation, seedSet, maxActiveNodes);
  }

  return Array.from(activation.entries())
    .map(([nodeId, score]) => ({
      nodeId,
      score,
      hops: firstReach.get(nodeId) ?? iterations,
      path: buildPath(nodeId, bestParent, firstReach),
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.hops - b.hops ||
        (a.nodeId < b.nodeId ? -1 : a.nodeId > b.nodeId ? 1 : 0),
    );
}
