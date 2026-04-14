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
} from './edge-builders.js';

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
 * 역 인덱스 구축: 노드 제목(단어 분리)과 태그를 lowercase term → NodeId Set으로 매핑.
 * 키워드 시드 해석 시 prefix matching으로 O(terms) 조회 지원.
 */
export function buildInvertedIndex(
  nodeMap: Map<NodeId, KnowledgeNode>,
): InvertedIndex {
  const index: InvertedIndex = new Map();

  function addTerm(term: string, nodeId: NodeId): void {
    const lower = term.toLowerCase();
    if (lower.length === 0) return;
    let set = index.get(lower);
    if (!set) {
      set = new Set();
      index.set(lower, set);
    }
    set.add(nodeId);
  }

  for (const [nodeId, node] of nodeMap) {
    // 제목을 단어로 분리하여 인덱싱
    const titleWords = node.title.split(/[\s\-_/\\.,;:!?()[\]{}'"]+/);
    for (const word of titleWords) {
      addTerm(word, nodeId);
    }
    // 태그를 통째로 인덱싱
    for (const tag of node.tags) {
      addTerm(tag, nodeId);
    }
    // mentioned_persons 인덱싱 (프론트매터에서 파싱된 경우)
    if (node.mentioned_persons) {
      for (const person of node.mentioned_persons) {
        addTerm(person, nodeId);
      }
    }
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
