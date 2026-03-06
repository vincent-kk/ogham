/**
 * @file kg-navigate.ts
 * @description kg_navigate 도구 핸들러 — 특정 노드의 이웃 조회
 */
import { toNodeId } from '../../types/common.js';
import type { KnowledgeEdge, KnowledgeGraph, KnowledgeNode } from '../../types/graph.js';
import type { KgNavigateInput, KgNavigateResult } from '../../types/mcp.js';

/**
 * 노드에 연결된 엣지만 필터링 (type-aware 이웃 조회).
 * adjacencyList가 있으면 outbound 이웃만 빠르게 조회하고 엣지 타입은 edgeWeightMap 구조 대신
 * 엣지 배열에서 해당 이웃에 대해서만 조회한다.
 */
function getEdgesForNode(
  graph: KnowledgeGraph,
  nodeId: string,
): { outbound: KnowledgeEdge[]; inbound: KnowledgeEdge[] } {
  // 사전 계산된 인접 리스트가 없으면 전체 스캔 폴백
  if (!graph.adjacencyList) {
    const outbound: KnowledgeEdge[] = [];
    const inbound: KnowledgeEdge[] = [];
    for (const edge of graph.edges) {
      if (edge.from === nodeId) outbound.push(edge);
      if (edge.to === nodeId) inbound.push(edge);
    }
    return { outbound, inbound };
  }

  // 인접 리스트 기반 최적화: outbound 이웃 확인 후 엣지 타입/가중치 조회
  const outbound: KnowledgeEdge[] = [];
  const neighbors = graph.adjacencyList.get(nodeId as ReturnType<typeof toNodeId>) ?? [];
  for (const neighborId of neighbors) {
    // edgeWeightMap에서 가중치, 엣지 배열에서 타입 조회
    const edge = graph.edges.find(
      (e) => e.from === nodeId && e.to === neighborId,
    );
    if (edge) outbound.push(edge);
  }

  // inbound는 역방향이므로 전체 엣지에서 필터 (향후 역 인접 리스트로 최적화 가능)
  const inbound: KnowledgeEdge[] = [];
  for (const edge of graph.edges) {
    if (edge.to === nodeId) inbound.push(edge);
  }

  return { outbound, inbound };
}

/**
 * kg_navigate 핸들러
 */
export async function handleKgNavigate(
  graph: KnowledgeGraph | null,
  input: KgNavigateInput,
): Promise<KgNavigateResult | { error: string }> {
  if (!graph) {
    return {
      error: 'Index not built. Please run /maencof:build first.',
    };
  }

  const nodeId = toNodeId(input.path);
  const node = graph.nodes.get(nodeId);

  if (!node) {
    return { error: `Node not found: ${input.path}` };
  }

  const includeInbound = input.include_inbound ?? true;
  const includeOutbound = input.include_outbound ?? true;
  const includeHierarchy = input.include_hierarchy ?? true;

  const inbound: KnowledgeNode[] = [];
  const outbound: KnowledgeNode[] = [];
  let parent: KnowledgeNode | undefined;
  const children: KnowledgeNode[] = [];
  const siblings: KnowledgeNode[] = [];
  const crossLayer: KnowledgeNode[] = [];

  const { outbound: outEdges, inbound: inEdges } = getEdgesForNode(graph, nodeId);

  // Outbound 엣지 처리
  for (const edge of outEdges) {
    if (includeOutbound && edge.type === 'LINK') {
      const dst = graph.nodes.get(edge.to);
      if (dst) outbound.push(dst);
    }
    if (includeHierarchy) {
      if (edge.type === 'PARENT_OF') {
        const child = graph.nodes.get(edge.to);
        if (child) children.push(child);
      }
      if (edge.type === 'SIBLING') {
        const sib = graph.nodes.get(edge.to);
        if (sib) siblings.push(sib);
      }
    }
    if (edge.type === 'CROSS_LAYER') {
      const target = graph.nodes.get(edge.to);
      if (target) crossLayer.push(target);
    }
  }

  // Inbound 엣지 처리
  for (const edge of inEdges) {
    if (includeInbound && edge.type === 'LINK') {
      const src = graph.nodes.get(edge.from);
      if (src) inbound.push(src);
    }
    if (includeHierarchy && edge.type === 'PARENT_OF') {
      const p = graph.nodes.get(edge.from);
      if (p) parent = p;
    }
    if (edge.type === 'CROSS_LAYER') {
      const source = graph.nodes.get(edge.from);
      if (source) crossLayer.push(source);
    }
  }

  return {
    node,
    inbound,
    outbound,
    parent,
    children,
    siblings,
    crossLayer: crossLayer.length > 0 ? crossLayer : undefined,
  };
}
