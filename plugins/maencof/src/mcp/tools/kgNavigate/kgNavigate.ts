/**
 * @file kgNavigate.ts
 * @description kg_navigate 도구 핸들러 — 특정 노드의 이웃 조회
 */
import { MAX_NAVIGATE_SIBLINGS } from '../../../constants/thresholds.js';
import { toNodeId } from '../../../types/common.js';
import type {
  KnowledgeEdge,
  KnowledgeGraph,
  KnowledgeNode,
} from '../../../types/graph.js';
import type { KgNavigateInput, KgNavigateResult } from '../../../types/mcp.js';

/**
 * 노드에 연결된 엣지 필터링 — 단일 O(E) 패스.
 * graph.edges 는 명시 엣지만 담으므로(SIBLING 은 파생) 전체 순회가 가장 싸다.
 */
function getEdgesForNode(
  graph: KnowledgeGraph,
  nodeId: string,
): { outbound: KnowledgeEdge[]; inbound: KnowledgeEdge[] } {
  const outbound: KnowledgeEdge[] = [];
  const inbound: KnowledgeEdge[] = [];
  for (const edge of graph.edges) {
    if (edge.from === nodeId) outbound.push(edge);
    if (edge.to === nodeId) inbound.push(edge);
  }
  return { outbound, inbound };
}

/**
 * 동일 디렉토리 멤버십에서 형제 노드를 파생한다 (경로 정렬, 기본 MAX_NAVIGATE_SIBLINGS 상한).
 * 대형 자동수집 폴더에서 응답이 이웃 전체로 폭주하지 않도록 총수는 별도 반환하며,
 * includeAll 은 폴더 전체 열람이 필요한 호출자를 위한 opt-in 해제다.
 */
function collectSiblings(
  graph: KnowledgeGraph,
  node: KnowledgeNode,
  includeAll: boolean,
): { siblings: KnowledgeNode[]; total: number } {
  const dir = getDirectory(node.path);
  const members: KnowledgeNode[] = [];
  for (const candidate of graph.nodes.values())
    if (candidate.id !== node.id && getDirectory(candidate.path) === dir)
      members.push(candidate);

  members.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return {
    siblings: includeAll ? members : members.slice(0, MAX_NAVIGATE_SIBLINGS),
    total: members.length,
  };
}

/** 파일 경로에서 디렉토리 경로 추출 */
function getDirectory(filePath: string): string {
  const lastSlash = filePath.lastIndexOf('/');
  return lastSlash >= 0 ? filePath.slice(0, lastSlash) : '';
}

function collectOutboundNeighbors(
  outEdges: KnowledgeEdge[],
  graph: KnowledgeGraph,
  includeOutbound: boolean,
  includeHierarchy: boolean,
): {
  outbound: KnowledgeNode[];
  children: KnowledgeNode[];
  crossLayer: KnowledgeNode[];
  domain: KnowledgeNode[];
} {
  const outbound: KnowledgeNode[] = [];
  const children: KnowledgeNode[] = [];
  const crossLayer: KnowledgeNode[] = [];
  const domain: KnowledgeNode[] = [];

  for (const edge of outEdges) {
    if (includeOutbound && edge.type === 'LINK') {
      const dst = graph.nodes.get(edge.to);
      if (dst) outbound.push(dst);
    }
    if (includeHierarchy && edge.type === 'PARENT_OF') {
      const child = graph.nodes.get(edge.to);
      if (child) children.push(child);
    }
    if (edge.type === 'CROSS_LAYER') {
      const target = graph.nodes.get(edge.to);
      if (target) crossLayer.push(target);
    }
    if (edge.type === 'DOMAIN') {
      const target = graph.nodes.get(edge.to);
      if (target) domain.push(target);
    }
  }

  return { outbound, children, crossLayer, domain };
}

function collectInboundNeighbors(
  inEdges: KnowledgeEdge[],
  graph: KnowledgeGraph,
  includeInbound: boolean,
  includeHierarchy: boolean,
): {
  inbound: KnowledgeNode[];
  parent: KnowledgeNode | undefined;
  crossLayer: KnowledgeNode[];
  domain: KnowledgeNode[];
} {
  const inbound: KnowledgeNode[] = [];
  let parent: KnowledgeNode | undefined;
  const crossLayer: KnowledgeNode[] = [];
  const domain: KnowledgeNode[] = [];

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
    if (edge.type === 'DOMAIN') {
      const source = graph.nodes.get(edge.from);
      if (source) domain.push(source);
    }
  }

  return { inbound, parent, crossLayer, domain };
}

/**
 * kg_navigate 핸들러
 */
export async function handleKgNavigate(
  graph: KnowledgeGraph | null,
  input: KgNavigateInput,
): Promise<KgNavigateResult | { error: string }> {
  if (!graph)
    return {
      error: 'Index not built. Please run /maencof:build first.',
    };

  const nodeId = toNodeId(input.path);
  const node = graph.nodes.get(nodeId);

  if (!node) return { error: `Node not found: ${input.path}` };

  const includeInbound = input.include_inbound ?? true;
  const includeOutbound = input.include_outbound ?? true;
  const includeHierarchy = input.include_hierarchy ?? true;

  const { outbound: outEdges, inbound: inEdges } = getEdgesForNode(
    graph,
    nodeId,
  );

  const {
    outbound,
    children,
    crossLayer: outCrossLayer,
    domain: outDomain,
  } = collectOutboundNeighbors(
    outEdges,
    graph,
    includeOutbound,
    includeHierarchy,
  );

  const {
    inbound,
    parent,
    crossLayer: inCrossLayer,
    domain: inDomain,
  } = collectInboundNeighbors(inEdges, graph, includeInbound, includeHierarchy);

  const { siblings, total: siblingTotalCount } = includeHierarchy
    ? collectSiblings(graph, node, input.include_all_siblings ?? false)
    : { siblings: [], total: 0 };

  const crossLayer = [...outCrossLayer, ...inCrossLayer];
  const domain = [...outDomain, ...inDomain];

  return {
    node,
    inbound,
    outbound,
    parent,
    children,
    siblings,
    siblingTotalCount,
    crossLayer: crossLayer.length > 0 ? crossLayer : undefined,
    domain: domain.length > 0 ? domain : undefined,
  };
}
