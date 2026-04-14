/**
 * @file edge-builders.ts
 * @description Edge construction algorithms: hierarchy, sibling, relationship, domain, cross-layer
 */
import type { NodeId } from '../../types/common.js';
import type { KnowledgeEdge, KnowledgeNode } from '../../types/graph.js';
import { SYMMETRIC_RELATIONSHIPS } from '../../types/person.js';
import { MAX_CROSS_LAYER_EDGES_PER_NODE } from '../../constants/thresholds.js';

/**
 * 노드 경로를 디렉토리별로 그룹화한다.
 * key: 디렉토리 경로, value: 해당 디렉토리 노드 ID 목록
 */
export function buildDirectoryMap(nodes: KnowledgeNode[]): Map<string, NodeId[]> {
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
export function buildSiblingEdges(dirMap: Map<string, NodeId[]>): KnowledgeEdge[] {
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

/**
 * Person frontmatter가 있는 노드 쌍 간 RELATIONSHIP 엣지 생성.
 * 대칭 관계: 양방향 엣지 2개, 비대칭 관계: 단방향 엣지 1개.
 */
export function buildRelationshipEdges(nodes: KnowledgeNode[]): KnowledgeEdge[] {
  const edges: KnowledgeEdge[] = [];
  type PersonExt = KnowledgeNode & {
    person?: { relationship_type?: string; intimacy_level?: number };
  };

  const personNodes = nodes.filter(
    (n) => (n as PersonExt).person !== undefined,
  ) as PersonExt[];

  for (let i = 0; i < personNodes.length; i++) {
    for (let j = i + 1; j < personNodes.length; j++) {
      const a = personNodes[i];
      const b = personNodes[j];
      const relType = a.person?.relationship_type ?? '';
      const weight = 0.6;

      if (isSymmetricRelationship(relType)) {
        edges.push({ from: a.id, to: b.id, type: 'RELATIONSHIP', weight });
        edges.push({ from: b.id, to: a.id, type: 'RELATIONSHIP', weight });
      } else {
        edges.push({ from: a.id, to: b.id, type: 'RELATIONSHIP', weight });
      }
    }
  }

  return edges;
}

/**
 * 동일 domain 태그를 가진 노드 간 DOMAIN 엣지 생성 (cross-layer 연결).
 * weight=0.3, 양방향. 시스템 생성 엣지로 user-authored LINK와 구분된다.
 */
export function buildDomainEdges(nodes: KnowledgeNode[]): KnowledgeEdge[] {
  const edges: KnowledgeEdge[] = [];
  type DomainExt = KnowledgeNode & { domain?: string };

  const domainMap = new Map<string, DomainExt[]>();
  for (const node of nodes) {
    const ext = node as DomainExt;
    if (ext.domain) {
      if (!domainMap.has(ext.domain)) {
        domainMap.set(ext.domain, []);
      }
      domainMap.get(ext.domain)!.push(ext);
    }
  }

  for (const [, group] of domainMap) {
    if (group.length < 2) continue;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i];
        const b = group[j];
        edges.push({ from: a.id, to: b.id, type: 'DOMAIN', weight: 0.3 });
        edges.push({ from: b.id, to: a.id, type: 'DOMAIN', weight: 0.3 });
      }
    }
  }

  return edges;
}

/**
 * L5-Boundary 노드에서 connected_layers 내 노드로 CROSS_LAYER 엣지 생성.
 * 태그 겹침 기반으로 바운딩하고 MAX_CROSS_LAYER_EDGES_PER_NODE 캡 적용.
 */
export function buildCrossLayerEdges(nodes: KnowledgeNode[]): KnowledgeEdge[] {
  const edges: KnowledgeEdge[] = [];

  const boundaryNodes = nodes.filter(
    (n) =>
      n.subLayer === 'boundary' &&
      n.connectedLayers &&
      n.connectedLayers.length > 0,
  );

  if (boundaryNodes.length === 0) return edges;

  const layerMap = new Map<number, KnowledgeNode[]>();
  for (const node of nodes) {
    const layer = node.layer as number;
    if (!layerMap.has(layer)) {
      layerMap.set(layer, []);
    }
    layerMap.get(layer)!.push(node);
  }

  for (const boundary of boundaryNodes) {
    const boundaryTags = new Set(boundary.tags);
    let edgeCount = 0;

    for (const targetLayer of boundary.connectedLayers!) {
      const candidates = layerMap.get(targetLayer) ?? [];
      for (const candidate of candidates) {
        if (candidate.id === boundary.id) continue;
        if (edgeCount >= MAX_CROSS_LAYER_EDGES_PER_NODE) break;

        const hasOverlap = candidate.tags.some((tag) => boundaryTags.has(tag));
        if (!hasOverlap) continue;

        edges.push({
          from: boundary.id,
          to: candidate.id,
          type: 'CROSS_LAYER',
          weight: 1.0,
        });
        edges.push({
          from: candidate.id,
          to: boundary.id,
          type: 'CROSS_LAYER',
          weight: 1.0,
        });
        edgeCount++;
      }
      if (edgeCount >= MAX_CROSS_LAYER_EDGES_PER_NODE) break;
    }
  }

  return edges;
}

/** 대칭 관계 여부 확인 */
function isSymmetricRelationship(type: string): boolean {
  return (SYMMETRIC_RELATIONSHIPS as readonly string[]).includes(type);
}

/** 파일 경로에서 디렉토리 경로 추출 */
function getDirectory(filePath: string): string {
  const lastSlash = filePath.lastIndexOf('/');
  return lastSlash >= 0 ? filePath.slice(0, lastSlash) : '';
}
