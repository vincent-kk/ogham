/**
 * @file kg-navigate.ts
 * @description kg_navigate 도구 핸들러 — 특정 노드의 이웃 조회
 */
import { toNodeId } from '../../types/common.js';
import type { KnowledgeGraph, KnowledgeNode } from '../../types/graph.js';
import type { KgNavigateInput, KgNavigateResult } from '../../types/mcp.js';

/**
 * kg_navigate 핸들러
 */
export async function handleKgNavigate(
  graph: KnowledgeGraph | null,
  input: KgNavigateInput,
): Promise<KgNavigateResult | { error: string }> {
  if (!graph) {
    return {
      error: '인덱스가 빌드되지 않았습니다. /coffaen:build를 먼저 실행하세요.',
    };
  }

  const nodeId = toNodeId(input.path);
  const node = graph.nodes.get(nodeId);

  if (!node) {
    return { error: `노드를 찾을 수 없습니다: ${input.path}` };
  }

  const includeInbound = input.include_inbound ?? true;
  const includeOutbound = input.include_outbound ?? true;
  const includeHierarchy = input.include_hierarchy ?? true;

  const inbound: KnowledgeNode[] = [];
  const outbound: KnowledgeNode[] = [];
  let parent: KnowledgeNode | undefined;
  const children: KnowledgeNode[] = [];
  const siblings: KnowledgeNode[] = [];

  for (const edge of graph.edges) {
    if (includeInbound && edge.to === nodeId && edge.type === 'LINK') {
      const src = graph.nodes.get(edge.from);
      if (src) inbound.push(src);
    }
    if (includeOutbound && edge.from === nodeId && edge.type === 'LINK') {
      const dst = graph.nodes.get(edge.to);
      if (dst) outbound.push(dst);
    }
    if (includeHierarchy) {
      if (edge.from === nodeId && edge.type === 'PARENT_OF') {
        const child = graph.nodes.get(edge.to);
        if (child) children.push(child);
      }
      if (edge.to === nodeId && edge.type === 'PARENT_OF') {
        const p = graph.nodes.get(edge.from);
        if (p) parent = p;
      }
      if (edge.from === nodeId && edge.type === 'SIBLING') {
        const sib = graph.nodes.get(edge.to);
        if (sib) siblings.push(sib);
      }
    }
  }

  return { node, inbound, outbound, parent, children, siblings };
}
