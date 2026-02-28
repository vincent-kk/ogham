/**
 * @file graph-builder.ts
 * @description KnowledgeNode[] → KnowledgeGraph 변환, 엣지 생성, 인접 리스트 구성, 고립 노드 탐지
 */

import type { NodeId } from '../types/common.js';
import type {
  KnowledgeNode,
  KnowledgeEdge,
  KnowledgeGraph,
  AdjacencyList,
} from '../types/graph.js';

/** GraphBuilder 옵션 */
export interface GraphBuilderOptions {
  /** 고립 노드 포함 여부 (기본: true) */
  includeOrphans?: boolean;
}

/** GraphBuilder 결과 */
export interface GraphBuildResult {
  graph: KnowledgeGraph;
  adjacencyList: AdjacencyList;
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

  // LINK 엣지는 DocumentParser가 채운 outboundLinks 필드로부터 생성
  // KnowledgeNode에 outboundLinks가 있다고 가정 (graph.ts 확장 타입 참조)
  for (const node of nodes) {
    const ext = node as KnowledgeNode & { outboundLinks?: string[] };
    if (ext.outboundLinks) {
      for (const target of ext.outboundLinks) {
        const targetId = target as NodeId;
        if (nodeMap.has(targetId)) {
          edges.push({
            from: node.id,
            to: targetId,
            type: 'LINK',
            weight: 1.0, // WeightCalculator가 이후 재계산
          });
        }
      }
    }
  }

  // 디렉토리 계층 엣지 (PARENT_OF / CHILD_OF / SIBLING)
  const dirMap = buildDirectoryMap(nodes);
  const treeEdges = buildTreeEdges(nodes, dirMap, nodeMap);
  edges.push(...treeEdges);

  const graph: KnowledgeGraph = {
    nodes: nodeMap,
    edges,
    builtAt: new Date().toISOString(),
    nodeCount: nodeMap.size,
    edgeCount: edges.length,
  };

  const adjacencyList = buildAdjacencyList(nodeMap, edges);
  const orphanNodes = detectOrphans(nodeMap, edges);

  if (!includeOrphans) {
    for (const orphanId of orphanNodes) {
      graph.nodes.delete(orphanId);
    }
    graph.nodeCount = graph.nodes.size;
  }

  return { graph, adjacencyList, orphanNodes };
}

/**
 * 노드 경로를 디렉토리별로 그룹화한다.
 * key: 디렉토리 경로, value: 해당 디렉토리 노드 ID 목록
 */
function buildDirectoryMap(nodes: KnowledgeNode[]): Map<string, NodeId[]> {
  const dirMap = new Map<string, NodeId[]>();
  for (const node of nodes) {
    const dir = getDirectory(node.path);
    if (!dirMap.has(dir)) {
      dirMap.set(dir, []);
    }
    dirMap.get(dir)!.push(node.id);
  }
  return dirMap;
}

/**
 * 디렉토리 맵으로부터 PARENT_OF / CHILD_OF / SIBLING 엣지를 생성한다.
 */
function buildTreeEdges(
  nodes: KnowledgeNode[],
  dirMap: Map<string, NodeId[]>,
  nodeMap: Map<NodeId, KnowledgeNode>,
): KnowledgeEdge[] {
  const edges: KnowledgeEdge[] = [];

  // PARENT_OF / CHILD_OF: 상위 디렉토리의 index.md → 하위 노드
  for (const node of nodes) {
    const dir = getDirectory(node.path);
    const parentDir = getDirectory(dir);
    if (parentDir !== dir) {
      // 상위 디렉토리에 index 노드가 있으면 PARENT_OF/CHILD_OF 엣지 생성
      const parentIndexId = `${parentDir}/index.md` as NodeId;
      if (nodeMap.has(parentIndexId)) {
        edges.push({
          from: parentIndexId,
          to: node.id,
          type: 'PARENT_OF',
          weight: 1.0,
        });
        edges.push({
          from: node.id,
          to: parentIndexId,
          type: 'CHILD_OF',
          weight: 1.0,
        });
      }
    }
  }

  // SIBLING: 동일 디렉토리 내 노드 쌍
  for (const [, siblings] of dirMap) {
    if (siblings.length < 2) continue;
    for (let i = 0; i < siblings.length; i++) {
      for (let j = i + 1; j < siblings.length; j++) {
        const a = siblings[i];
        const b = siblings[j];
        edges.push({ from: a, to: b, type: 'SIBLING', weight: 1.0 });
        edges.push({ from: b, to: a, type: 'SIBLING', weight: 1.0 });
      }
    }
  }

  return edges;
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

/** 파일 경로에서 디렉토리 경로 추출 */
function getDirectory(filePath: string): string {
  const lastSlash = filePath.lastIndexOf('/');
  return lastSlash >= 0 ? filePath.slice(0, lastSlash) : '';
}
