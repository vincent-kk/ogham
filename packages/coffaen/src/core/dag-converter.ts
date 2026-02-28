/**
 * @file dag-converter.ts
 * @description 순환 탐지 (DFS) + DAG 변환 — 순환 엣지 가중치를 0.1로 약화, 레이어 기반 방향성 보정
 */
import type { NodeId } from '../types/common.js';
import type { KnowledgeEdge, KnowledgeGraph } from '../types/graph.js';

/** DAG 변환 결과 */
export interface DAGConvertResult {
  /** 변환된 그래프 (순환 엣지 가중치 약화) */
  graph: KnowledgeGraph;
  /** 약화된 순환 엣지 목록 */
  weakenedEdges: KnowledgeEdge[];
  /** 탐지된 순환 수 */
  cycleCount: number;
}

/** DFS 방문 상태 */
type VisitState = 'unvisited' | 'in-stack' | 'done';

/**
 * KnowledgeGraph를 DAG로 변환한다.
 * - 순환 엣지를 제거하는 대신 가중치를 CYCLE_WEIGHT(0.1)로 약화
 * - 레이어 기반 방향성 보정: 높은 Layer → 낮은 Layer 방향 엣지를 역방향으로 처리
 */
export function convertToDAG(graph: KnowledgeGraph): DAGConvertResult {
  const { cycleEdgeKeys, cycleCount } = detectCycleEdges(graph);

  const weakenedEdges: KnowledgeEdge[] = [];
  const newEdges = graph.edges.map((edge) => {
    const key = edgeKey(edge.from, edge.to);
    if (cycleEdgeKeys.has(key)) {
      const weakened: KnowledgeEdge = { ...edge, weight: CYCLE_WEIGHT };
      weakenedEdges.push(weakened);
      return weakened;
    }
    return edge;
  });

  const convertedGraph: KnowledgeGraph = {
    ...graph,
    edges: newEdges,
    edgeCount: newEdges.length,
  };

  return { graph: convertedGraph, weakenedEdges, cycleCount };
}

/** 순환 엣지 가중치 (제거 대신 약화) */
const CYCLE_WEIGHT = 0.1;

/**
 * DFS로 순환 엣지를 탐지한다.
 * back-edge (현재 DFS 스택에 있는 노드로의 엣지)를 순환 엣지로 식별.
 */
function detectCycleEdges(graph: KnowledgeGraph): {
  cycleEdgeKeys: Set<string>;
  cycleCount: number;
} {
  const state = new Map<NodeId, VisitState>();
  const cycleEdgeKeys = new Set<string>();
  let cycleCount = 0;

  for (const id of graph.nodes.keys()) {
    state.set(id, 'unvisited');
  }

  // 인접 리스트 구성 (LINK 엣지만 방향성 고려, SIBLING은 무시)
  const adj = new Map<NodeId, Array<{ to: NodeId; edgeKey: string }>>();
  for (const id of graph.nodes.keys()) {
    adj.set(id, []);
  }
  for (const edge of graph.edges) {
    if (edge.type === 'LINK' || edge.type === 'PARENT_OF') {
      adj
        .get(edge.from)
        ?.push({ to: edge.to, edgeKey: edgeKey(edge.from, edge.to) });
    }
  }

  function dfs(nodeId: NodeId): void {
    state.set(nodeId, 'in-stack');
    const neighbors = adj.get(nodeId) ?? [];
    for (const { to, edgeKey: key } of neighbors) {
      const s = state.get(to);
      if (s === 'in-stack') {
        // back-edge → 순환 엣지
        cycleEdgeKeys.add(key);
        cycleCount++;
      } else if (s === 'unvisited') {
        dfs(to);
      }
    }
    state.set(nodeId, 'done');
  }

  for (const id of graph.nodes.keys()) {
    if (state.get(id) === 'unvisited') {
      dfs(id);
    }
  }

  return { cycleEdgeKeys, cycleCount };
}

/**
 * 레이어 기반 방향성 보정.
 * Layer 값이 높은 노드 → 낮은 노드 방향이 올바른 방향.
 * 역방향 LINK 엣지(낮은 Layer → 높은 Layer)를 약화.
 */
export function applyLayerDirectionality(
  graph: KnowledgeGraph,
): KnowledgeGraph {
  const newEdges = graph.edges.map((edge) => {
    if (edge.type !== 'LINK') return edge;
    const fromNode = graph.nodes.get(edge.from);
    const toNode = graph.nodes.get(edge.to);
    if (!fromNode || !toNode) return edge;
    // Layer 1 → 높은 Layer로의 아웃바운드 링크는 설계 위반 → 약화
    if (fromNode.layer === 1 && toNode.layer > 1) {
      return { ...edge, weight: CYCLE_WEIGHT };
    }
    return edge;
  });

  return { ...graph, edges: newEdges };
}

/** 엣지 식별 키 생성 */
function edgeKey(from: NodeId, to: NodeId): string {
  return `${from}→${to}`;
}
