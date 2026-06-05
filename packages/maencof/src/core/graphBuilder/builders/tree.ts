/**
 * @file tree.ts
 * @description 디렉토리 계층 기반 PARENT_OF / CHILD_OF / SIBLING 엣지 생성.
 */
import type { NodeId } from '../../../types/common.js';
import type { KnowledgeEdge, KnowledgeNode } from '../../../types/graph.js';

/**
 * 노드 경로를 디렉토리별로 그룹화한다.
 * key: 디렉토리 경로, value: 해당 디렉토리 노드 ID 목록
 */
export function buildDirectoryMap(
  nodes: KnowledgeNode[],
): Map<string, NodeId[]> {
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
export function buildTreeEdges(
  nodes: KnowledgeNode[],
  dirMap: Map<string, NodeId[]>,
  nodeMap: Map<NodeId, KnowledgeNode>,
): KnowledgeEdge[] {
  return [...buildHierarchyEdges(nodes, nodeMap), ...buildSiblingEdges(dirMap)];
}

/**
 * PARENT_OF / CHILD_OF 엣지 생성: 상위 디렉토리의 index.md → 하위 노드
 */
export function buildHierarchyEdges(
  nodes: KnowledgeNode[],
  nodeMap: Map<NodeId, KnowledgeNode>,
): KnowledgeEdge[] {
  const edges: KnowledgeEdge[] = [];
  for (const node of nodes) {
    const dir = getDirectory(node.path);
    const parentDir = getDirectory(dir);
    if (parentDir === dir) continue;
    const parentIndexId = `${parentDir}/index.md` as NodeId;
    if (!nodeMap.has(parentIndexId)) continue;
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
  return edges;
}

/**
 * SIBLING 엣지 생성: 동일 디렉토리 내 노드 쌍 (양방향)
 */
export function buildSiblingEdges(
  dirMap: Map<string, NodeId[]>,
): KnowledgeEdge[] {
  const edges: KnowledgeEdge[] = [];
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

/** 파일 경로에서 디렉토리 경로 추출 */
function getDirectory(filePath: string): string {
  const lastSlash = filePath.lastIndexOf('/');
  return lastSlash >= 0 ? filePath.slice(0, lastSlash) : '';
}
