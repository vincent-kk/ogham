import { Layer, toNodeId } from '../../../../../types/common.js';
import type {
  KnowledgeGraph,
  KnowledgeNode,
} from '../../../../../types/graph.js';

/**
 * @param label 저장별 노드·엣지 식별자에 넣을 비어 있지 않은 테스트 이름.
 * @returns 유효한 레이어 경로의 두 노드와 링크를 가진 독립 그래프. I/O는 수행하지 않는다.
 */
export function buildGenerationGraph(label: string): KnowledgeGraph {
  const nodes: KnowledgeNode[] = ['a', 'b'].map((suffix) => ({
    id: toNodeId(`04_Action/${label}-${suffix}.md`),
    path: `04_Action/${label}-${suffix}.md`,
    title: `${label}-${suffix}`,
    layer: Layer.L4_ACTION,
    tags: [],
    created: '2026-01-01',
    updated: '2026-01-01',
    mtime: 0,
    accessed_count: 0,
  }));
  return {
    nodes: new Map(nodes.map((node) => [node.id, node])),
    edges: [{ from: nodes[0].id, to: nodes[1].id, type: 'LINK', weight: 1 }],
    builtAt: label,
    nodeCount: nodes.length,
    edgeCount: 1,
  };
}
