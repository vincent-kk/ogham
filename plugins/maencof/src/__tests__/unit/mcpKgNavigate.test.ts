/**
 * @file mcpKgNavigate.test.ts
 * @description handleKgNavigate 유닛 테스트
 */
import { describe, expect, it } from 'vitest';

import { handleKgNavigate } from '../../mcp/tools/kgNavigate/kgNavigate.js';
import { toNodeId } from '../../types/common.js';
import type {
  KnowledgeEdge,
  KnowledgeGraph,
  KnowledgeNode,
} from '../../types/graph.js';

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

function makeNode(id: string, layer: number = 2): KnowledgeNode {
  return {
    id: toNodeId(id),
    path: id,
    title: id,
    layer: layer as 1 | 2 | 3 | 4,
    tags: ['test'],
    created: '2024-01-01',
    updated: '2024-01-01',
    mtime: Date.now(),
    accessed_count: 0,
    pagerank: 0.15,
  };
}

function makeGraph(
  nodes: KnowledgeNode[],
  edges: KnowledgeEdge[] = [],
): KnowledgeGraph {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  return {
    nodes: nodeMap,
    edges,
    builtAt: new Date().toISOString(),
    nodeCount: nodes.length,
    edgeCount: edges.length,
  };
}

// ─── handleKgNavigate ─────────────────────────────────────────────────────────

describe('handleKgNavigate', () => {
  it('graph가 null이면 error를 반환한다', async () => {
    const result = await handleKgNavigate(null, { path: 'test.md' });
    expect('error' in result).toBe(true);
    if ('error' in result) expect(result.error).toContain('Index not built');
  });

  it('존재하지 않는 노드이면 error를 반환한다', async () => {
    const graph = makeGraph([makeNode('a.md')]);
    const result = await handleKgNavigate(graph, { path: 'nonexistent.md' });
    expect('error' in result).toBe(true);
    if ('error' in result) expect(result.error).toContain('Node not found');
  });

  it('인바운드 LINK 엣지를 올바르게 반환한다', async () => {
    const nodeA = makeNode('a.md');
    const nodeB = makeNode('b.md');
    const edges: KnowledgeEdge[] = [
      { from: nodeA.id, to: nodeB.id, type: 'LINK', weight: 1.0 },
    ];
    const graph = makeGraph([nodeA, nodeB], edges);

    const result = await handleKgNavigate(graph, { path: 'b.md' });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.inbound).toHaveLength(1);
      expect(result.inbound[0].path).toBe('a.md');
      expect(result.outbound).toHaveLength(0);
    }
  });

  it('아웃바운드 LINK 엣지를 올바르게 반환한다', async () => {
    const nodeA = makeNode('a.md');
    const nodeB = makeNode('b.md');
    const edges: KnowledgeEdge[] = [
      { from: nodeA.id, to: nodeB.id, type: 'LINK', weight: 1.0 },
    ];
    const graph = makeGraph([nodeA, nodeB], edges);

    const result = await handleKgNavigate(graph, { path: 'a.md' });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.outbound).toHaveLength(1);
      expect(result.outbound[0].path).toBe('b.md');
      expect(result.inbound).toHaveLength(0);
    }
  });

  it('PARENT_OF 엣지로 parent/children을 반환한다', async () => {
    const parent = makeNode('parent.md');
    const child = makeNode('child.md');
    const edges: KnowledgeEdge[] = [
      { from: parent.id, to: child.id, type: 'PARENT_OF', weight: 1.0 },
    ];
    const graph = makeGraph([parent, child], edges);

    const parentResult = await handleKgNavigate(graph, { path: 'parent.md' });
    const childResult = await handleKgNavigate(graph, { path: 'child.md' });

    expect('error' in parentResult).toBe(false);
    expect('error' in childResult).toBe(false);

    if (!('error' in parentResult)) {
      expect(parentResult.children).toHaveLength(1);
      expect(parentResult.children[0].path).toBe('child.md');
      expect(parentResult.parent).toBeUndefined();
    }

    if (!('error' in childResult)) {
      expect(childResult.parent?.path).toBe('parent.md');
      expect(childResult.children).toHaveLength(0);
    }
  });

  it('동일 디렉토리 멤버십에서 siblings를 파생한다 (엣지 불필요)', async () => {
    const nodeA = makeNode('02_Derived/a.md');
    const nodeB = makeNode('02_Derived/b.md');
    const nodeC = makeNode('01_Core/c.md');
    const graph = makeGraph([nodeA, nodeB, nodeC]);

    const result = await handleKgNavigate(graph, { path: '02_Derived/a.md' });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.siblings).toHaveLength(1);
      expect(result.siblings[0].path).toBe('02_Derived/b.md');
      expect(result.siblingTotalCount).toBe(1);
    }
  });

  it('siblings를 기본 상한으로 절단하고 총수를 별도 보고한다', async () => {
    const dir = '04_Action/bulk';
    const nodes = Array.from({ length: 55 }, (_, i) =>
      makeNode(`${dir}/doc-${String(i).padStart(2, '0')}.md`),
    );
    const graph = makeGraph(nodes);

    const result = await handleKgNavigate(graph, { path: `${dir}/doc-00.md` });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.siblings).toHaveLength(50);
      expect(result.siblingTotalCount).toBe(54);
      expect(result.siblings[0].path).toBe(`${dir}/doc-01.md`); // 경로 정렬
    }
  });

  it('include_all_siblings=true 이면 상한 없이 전체 형제를 반환한다', async () => {
    const dir = '04_Action/bulk';
    const nodes = Array.from({ length: 55 }, (_, i) =>
      makeNode(`${dir}/doc-${String(i).padStart(2, '0')}.md`),
    );
    const graph = makeGraph(nodes);

    const result = await handleKgNavigate(graph, {
      path: `${dir}/doc-00.md`,
      include_all_siblings: true,
    });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.siblings).toHaveLength(54);
      expect(result.siblingTotalCount).toBe(54);
    }
  });

  it('include_inbound=false이면 인바운드 링크를 제외한다', async () => {
    const nodeA = makeNode('a.md');
    const nodeB = makeNode('b.md');
    const edges: KnowledgeEdge[] = [
      { from: nodeA.id, to: nodeB.id, type: 'LINK', weight: 1.0 },
    ];
    const graph = makeGraph([nodeA, nodeB], edges);

    const result = await handleKgNavigate(graph, {
      path: 'b.md',
      include_inbound: false,
    });

    expect('error' in result).toBe(false);
    if (!('error' in result)) expect(result.inbound).toHaveLength(0);
  });

  it('include_hierarchy=false이면 parent/children/siblings를 제외한다', async () => {
    const parent = makeNode('parent.md');
    const child = makeNode('child.md');
    const edges: KnowledgeEdge[] = [
      { from: parent.id, to: child.id, type: 'PARENT_OF', weight: 1.0 },
    ];
    const graph = makeGraph([parent, child], edges);

    const result = await handleKgNavigate(graph, {
      path: 'child.md',
      include_hierarchy: false,
    });

    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.parent).toBeUndefined();
      expect(result.children).toHaveLength(0);
      expect(result.siblings).toHaveLength(0); // 동일 루트 디렉토리지만 hierarchy 제외
      expect(result.siblingTotalCount).toBe(0);
    }
  });

  it('노드 자기 자신을 node 필드로 반환한다', async () => {
    const node = makeNode('target.md');
    const graph = makeGraph([node]);

    const result = await handleKgNavigate(graph, { path: 'target.md' });
    expect('error' in result).toBe(false);
    if (!('error' in result)) expect(result.node.path).toBe('target.md');
  });
});
