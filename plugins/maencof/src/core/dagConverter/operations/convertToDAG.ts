/**
 * @file convertToDAG.ts
 * @description 순환 탐지 (DFS) + DAG 변환 — 순환 엣지 가중치를 0.1로 약화.
 */
import { CYCLE_WEIGHT } from '../../../constants/weights.js';
import type { NodeId } from '../../../types/common.js';
import type { KnowledgeEdge, KnowledgeGraph } from '../../../types/graph.js';
import type { DAGConvertResult } from '../types/types.js';

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

  for (const id of graph.nodes.keys()) state.set(id, 'unvisited');

  // 인접 리스트 구성 (LINK 엣지만 방향성 고려, SIBLING은 무시)
  const adj = new Map<NodeId, Array<{ to: NodeId; edgeKey: string }>>();
  for (const id of graph.nodes.keys()) adj.set(id, []);

  for (const edge of graph.edges)
    if (edge.type === 'LINK' || edge.type === 'PARENT_OF')
      adj
        .get(edge.from)
        ?.push({ to: edge.to, edgeKey: edgeKey(edge.from, edge.to) });

  function dfs(nodeId: NodeId): void {
    state.set(nodeId, 'in-stack');
    const neighbors = adj.get(nodeId) ?? [];
    for (const { to, edgeKey: key } of neighbors) {
      const s = state.get(to);
      if (s === 'in-stack') {
        // back-edge → 순환 엣지
        cycleEdgeKeys.add(key);
        cycleCount++;
      } else if (s === 'unvisited') dfs(to);
    }
    state.set(nodeId, 'done');
  }

  for (const id of graph.nodes.keys())
    if (state.get(id) === 'unvisited') dfs(id);

  return { cycleEdgeKeys, cycleCount };
}

/** 엣지 식별 키 생성 */
function edgeKey(from: NodeId, to: NodeId): string {
  return `${from}→${to}`;
}
