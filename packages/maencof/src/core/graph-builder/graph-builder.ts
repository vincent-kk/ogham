/**
 * @file graph-builder.ts
 * @description KnowledgeNode[] → KnowledgeGraph 변환, 인접 리스트 구성, 고립 노드 탐지
 */
import type { NodeId } from '../../types/common.js';
import type {
  AdjacencyList,
  InvertedIndex,
  KnowledgeEdge,
  KnowledgeGraph,
  KnowledgeNode,
} from '../../types/graph.js';

import {
  buildCrossLayerEdges,
  buildDirectoryMap,
  buildDomainEdges,
  buildRelationshipEdges,
  buildTreeEdges,
} from './builders/index.js';

/** GraphBuilder 옵션 */
export interface GraphBuilderOptions {
  /** 고립 노드 포함 여부 (기본: true) */
  includeOrphans?: boolean;
}

/** GraphBuilder 결과 */
export interface GraphBuildResult {
  graph: KnowledgeGraph;
  adjacencyList: AdjacencyList;
  invertedIndex: InvertedIndex;
  orphanNodes: NodeId[];
}

/**
 * 파싱된 KnowledgeNode 목록으로부터 KnowledgeGraph를 구성한다.
 * - LINK 엣지: 각 노드의 outboundLinks에서 생성
 * - PARENT_OF / CHILD_OF: 디렉토리 계층에서 생성
 * - SIBLING: 동일 디렉토리 내 문서 간 관계
 */
export function buildGraph(
  nodes: KnowledgeNode[],
  options: GraphBuilderOptions = {},
): GraphBuildResult {
  const { includeOrphans = true } = options;

  const nodeMap = new Map<NodeId, KnowledgeNode>();
  for (const node of nodes) {
    nodeMap.set(node.id, node);
  }

  const edges: KnowledgeEdge[] = [];

  // LINK 엣지는 kg-build가 채운 outboundLinks 필드로부터 생성
  for (const node of nodes) {
    if (node.outboundLinks) {
      for (const target of node.outboundLinks) {
        const targetId = target as NodeId;
        if (nodeMap.has(targetId)) {
          edges.push({
            from: node.id,
            to: targetId,
            type: 'LINK',
            weight: 1.0,
          });
        }
      }
    }
  }

  // 디렉토리 계층 엣지 (PARENT_OF / CHILD_OF / SIBLING)
  const dirMap = buildDirectoryMap(nodes);
  const treeEdges = buildTreeEdges(nodes, dirMap, nodeMap);
  for (const e of treeEdges) edges.push(e);

  // RELATIONSHIP 엣지: person frontmatter가 있는 노드 쌍 간 관계 엣지 생성
  const relationshipEdges = buildRelationshipEdges(nodes);
  for (const e of relationshipEdges) edges.push(e);

  // Domain cross-layer 연결: 동일 domain 태그를 가진 노드 간 약한 LINK 엣지 (weight=0.3)
  const domainEdges = buildDomainEdges(nodes);
  for (const e of domainEdges) edges.push(e);

  // CROSS_LAYER 엣지: L5-Boundary 노드에서 connected_layers 내 태그 겹침 노드로
  const crossLayerEdges = buildCrossLayerEdges(nodes);
  for (const e of crossLayerEdges) edges.push(e);

  const graph: KnowledgeGraph = {
    nodes: nodeMap,
    edges,
    builtAt: new Date().toISOString(),
    nodeCount: nodeMap.size,
    edgeCount: edges.length,
  };

  const adjacencyList = buildAdjacencyList(nodeMap, edges);
  const invertedIndex = buildInvertedIndex(nodeMap);
  const orphanNodes = detectOrphans(nodeMap, edges);

  if (!includeOrphans) {
    for (const orphanId of orphanNodes) {
      graph.nodes.delete(orphanId);
    }
    graph.nodeCount = graph.nodes.size;
  }

  return { graph, adjacencyList, invertedIndex, orphanNodes };
}

/**
 * 인접 리스트 구성 (NodeId → 이웃 NodeId[])
 */
export function buildAdjacencyList(
  nodeMap: Map<NodeId, KnowledgeNode>,
  edges: KnowledgeEdge[],
): AdjacencyList {
  const adj: AdjacencyList = new Map();
  for (const id of nodeMap.keys()) {
    adj.set(id, []);
  }
  for (const edge of edges) {
    adj.get(edge.from)?.push(edge.to);
  }
  return adj;
}

/**
 * 노드의 invertedIndex 토큰을 구성한다 — title 단어 + tags + mentioned_persons (lowercase, 공백 제외).
 *
 * 본 함수는 buildInvertedIndex 와 incremental add/remove 헬퍼의 단일 출처로,
 * tokenization drift 를 차단한다.
 */
export function tokenizeForInvertedIndex(node: KnowledgeNode): string[] {
  const terms: string[] = [];
  for (const word of node.title.split(/[\s\-_/\\.,;:!?()[\]{}'"]+/)) {
    const lower = word.toLowerCase();
    if (lower.length > 0) terms.push(lower);
  }
  for (const tag of node.tags) {
    const lower = tag.toLowerCase();
    if (lower.length > 0) terms.push(lower);
  }
  if (node.mentioned_persons) {
    for (const person of node.mentioned_persons) {
      const lower = person.toLowerCase();
      if (lower.length > 0) terms.push(lower);
    }
  }
  return terms;
}

/**
 * 단일 노드를 invertedIndex 에 추가한다 (term Set 에 nodeId 합집합).
 * `index` 가 undefined 면 no-op.
 */
export function addNodeToInvertedIndex(
  index: InvertedIndex | undefined,
  node: KnowledgeNode,
): void {
  if (!index) return;
  for (const term of tokenizeForInvertedIndex(node)) {
    let set = index.get(term);
    if (!set) {
      set = new Set();
      index.set(term, set);
    }
    set.add(node.id);
  }
}

/**
 * 단일 노드를 invertedIndex 에서 제거한다. term Set 이 비면 term 자체 삭제 (term 누수 방지).
 * `index` 가 undefined 면 no-op.
 */
export function removeNodeFromInvertedIndex(
  index: InvertedIndex | undefined,
  node: KnowledgeNode,
): void {
  if (!index) return;
  for (const term of tokenizeForInvertedIndex(node)) {
    const set = index.get(term);
    if (!set) continue;
    set.delete(node.id);
    if (set.size === 0) {
      index.delete(term);
    }
  }
}

/**
 * 역 인덱스 구축: 노드 제목(단어 분리)과 태그를 lowercase term → NodeId Set 으로 매핑.
 * 키워드 시드 해석 시 prefix matching 으로 O(terms) 조회 지원.
 */
export function buildInvertedIndex(
  nodeMap: Map<NodeId, KnowledgeNode>,
): InvertedIndex {
  const index: InvertedIndex = new Map();
  for (const node of nodeMap.values()) {
    addNodeToInvertedIndex(index, node);
  }
  return index;
}

/**
 * 고립 노드 탐지: 엣지가 전혀 없는 노드 반환
 */
export function detectOrphans(
  nodeMap: Map<NodeId, KnowledgeNode>,
  edges: KnowledgeEdge[],
): NodeId[] {
  const connected = new Set<NodeId>();
  for (const edge of edges) {
    connected.add(edge.from);
    connected.add(edge.to);
  }
  const orphans: NodeId[] = [];
  for (const id of nodeMap.keys()) {
    if (!connected.has(id)) {
      orphans.push(id);
    }
  }
  return orphans;
}
