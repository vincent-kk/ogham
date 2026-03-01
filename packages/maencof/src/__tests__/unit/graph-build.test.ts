/**
 * @file graph-build.test.ts
 * @description GraphBuilder 핵심 빌드 함수 단위 테스트
 * (buildGraph, buildAdjacencyList, detectOrphans)
 */
import { describe, expect, it } from 'vitest';

import {
  buildAdjacencyList,
  buildGraph,
  detectOrphans,
} from '../../core/graph-builder.js';
import { Layer, toNodeId } from '../../types/common.js';
import type { KnowledgeNode } from '../../types/graph.js';

function makeNode(
  path: string,
  layer: Layer = Layer.L2_DERIVED,
): KnowledgeNode {
  return {
    id: toNodeId(path),
    path,
    title: path,
    layer,
    tags: ['test'],
    created: '2026-01-01',
    updated: '2026-01-01',
    mtime: 0,
    accessed_count: 0,
  };
}

describe('buildGraph', () => {
  it('빈 노드 배열로 빈 그래프를 반환한다', () => {
    const { graph } = buildGraph([]);
    expect(graph.nodeCount).toBe(0);
    expect(graph.edgeCount).toBe(0);
  });

  it('노드 1개로 그래프를 구성한다', () => {
    const node = makeNode('01_Core/values.md', Layer.L1_CORE);
    const { graph } = buildGraph([node]);
    expect(graph.nodeCount).toBe(1);
    expect(graph.nodes.has(node.id)).toBe(true);
  });

  it('LINK 엣지를 outboundLinks로부터 생성한다', () => {
    const a = makeNode('01_Core/a.md') as KnowledgeNode & {
      outboundLinks: string[];
    };
    const b = makeNode('01_Core/b.md');
    a.outboundLinks = [b.path];

    const { graph } = buildGraph([a, b]);
    const linkEdges = graph.edges.filter((e) => e.type === 'LINK');
    expect(linkEdges).toHaveLength(1);
    expect(linkEdges[0].from).toBe(a.id);
    expect(linkEdges[0].to).toBe(b.id);
  });

  it('존재하지 않는 링크 대상은 엣지를 생성하지 않는다', () => {
    const a = makeNode('01_Core/a.md') as KnowledgeNode & {
      outboundLinks: string[];
    };
    a.outboundLinks = ['nonexistent.md'];

    const { graph } = buildGraph([a]);
    const linkEdges = graph.edges.filter((e) => e.type === 'LINK');
    expect(linkEdges).toHaveLength(0);
  });

  it('SIBLING 엣지를 동일 디렉토리 노드 간에 생성한다', () => {
    const a = makeNode('02_Derived/a.md');
    const b = makeNode('02_Derived/b.md');
    const c = makeNode('02_Derived/c.md');

    const { graph } = buildGraph([a, b, c]);
    const siblingEdges = graph.edges.filter((e) => e.type === 'SIBLING');
    // 3개 노드 쌍: (a,b), (a,c), (b,c) 각 양방향 = 6
    expect(siblingEdges).toHaveLength(6);
  });

  it('includeOrphans=false 시 고립 노드를 그래프에서 제외한다', () => {
    const a = makeNode('01_Core/a.md');
    const b = makeNode('02_Derived/b.md');
    // a와 b는 서로 다른 디렉토리, 링크 없음 → 고립

    const { graph, orphanNodes } = buildGraph([a, b], {
      includeOrphans: false,
    });
    expect(orphanNodes.length).toBeGreaterThan(0);
    for (const orphanId of orphanNodes) {
      expect(graph.nodes.has(orphanId)).toBe(false);
    }
  });

  it('builtAt이 ISO 날짜 형식이다', () => {
    const { graph } = buildGraph([makeNode('a/b.md')]);
    expect(() => new Date(graph.builtAt)).not.toThrow();
  });
});

describe('buildAdjacencyList', () => {
  it('모든 노드에 대해 빈 배열로 초기화된다', () => {
    const nodes = [makeNode('a/a.md'), makeNode('b/b.md')];
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const adj = buildAdjacencyList(nodeMap, []);
    expect(adj.size).toBe(2);
    for (const neighbors of adj.values()) {
      expect(neighbors).toEqual([]);
    }
  });

  it('엣지로부터 인접 리스트를 올바르게 구성한다', () => {
    const a = makeNode('a/a.md');
    const b = makeNode('b/b.md');
    const nodeMap = new Map([
      [a.id, a],
      [b.id, b],
    ]);
    const edges = [
      { from: a.id, to: b.id, type: 'LINK' as const, weight: 1.0 },
    ];
    const adj = buildAdjacencyList(nodeMap, edges);
    expect(adj.get(a.id)).toContain(b.id);
    expect(adj.get(b.id)).toHaveLength(0);
  });
});

describe('detectOrphans', () => {
  it('엣지가 없는 노드를 고립 노드로 반환한다', () => {
    const a = makeNode('a/a.md');
    const b = makeNode('b/b.md');
    const nodeMap = new Map([
      [a.id, a],
      [b.id, b],
    ]);
    const orphans = detectOrphans(nodeMap, []);
    expect(orphans).toContain(a.id);
    expect(orphans).toContain(b.id);
  });

  it('연결된 노드는 고립 노드로 반환하지 않는다', () => {
    const a = makeNode('a/a.md');
    const b = makeNode('b/b.md');
    const nodeMap = new Map([
      [a.id, a],
      [b.id, b],
    ]);
    const edges = [
      { from: a.id, to: b.id, type: 'LINK' as const, weight: 1.0 },
    ];
    const orphans = detectOrphans(nodeMap, edges);
    expect(orphans).not.toContain(a.id);
    expect(orphans).not.toContain(b.id);
  });
});
