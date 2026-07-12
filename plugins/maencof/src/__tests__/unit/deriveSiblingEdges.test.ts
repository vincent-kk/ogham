/**
 * @file deriveSiblingEdges.test.ts
 * @description SIBLING 파생 — 물질화 대체의 동등성 보장
 * (전쌍 파생, 폴더 상수 가중치, LINK 선점 유지, 구형 인덱스 병합, SA 동등성).
 */
import { describe, expect, it } from 'vitest';

import {
  deriveSiblingEdges,
  hydrateRuntimeMaps,
} from '../../core/graphBuilder/index.js';
import { runAccumulativeActivation } from '../../core/spreadingActivation/index.js';
import { Layer, toNodeId } from '../../types/common.js';
import type {
  KnowledgeEdge,
  KnowledgeGraph,
  KnowledgeNode,
} from '../../types/graph.js';

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

function makeGraph(
  nodes: KnowledgeNode[],
  edges: KnowledgeEdge[],
): KnowledgeGraph {
  return {
    nodes: new Map(nodes.map((n) => [n.id, n])),
    edges,
    builtAt: '2026-01-01T00:00:00.000Z',
    nodeCount: nodes.length,
    edgeCount: edges.length,
  };
}

describe('deriveSiblingEdges', () => {
  it('동일 디렉토리 전쌍을 양방향 파생하고 폴더 상수 가중치를 부여한다', () => {
    const nodes = [
      makeNode('02_Derived/topic/a.md'),
      makeNode('02_Derived/topic/b.md'),
      makeNode('02_Derived/topic/c.md'),
      makeNode('01_Core/solo.md'),
    ];
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const derived = Array.from(deriveSiblingEdges(nodeMap));

    // 3개 멤버 → 쌍 3개 × 양방향 = 6, solo 디렉토리는 파생 없음
    expect(derived).toHaveLength(6);
    for (const edge of derived) {
      expect(edge.type).toBe('SIBLING');
      expect(edge.weight).toBeCloseTo(2 / 3, 5); // depth 3 → (d-1)/d
    }
  });

  it('루트 디렉토리 파일의 파생 가중치는 0이다', () => {
    const nodes = [makeNode('a.md'), makeNode('b.md')];
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const derived = Array.from(deriveSiblingEdges(nodeMap));

    expect(derived).toHaveLength(2);
    for (const edge of derived) expect(edge.weight).toBe(0);
  });

  it('hydrate 시 LINK 평행 쌍은 파생 SIBLING 에 선점을 내주지 않는다', () => {
    const a = makeNode('02_Derived/a.md');
    const b = makeNode('02_Derived/b.md');
    const graph = makeGraph(
      [a, b],
      [{ from: a.id, to: b.id, type: 'LINK', weight: 0.5 }],
    );
    hydrateRuntimeMaps(graph);

    expect(graph.edgeTypeMap?.get(a.id)?.get(b.id)).toBe('LINK');
    expect(graph.edgeWeightMap?.get(a.id)?.get(b.id)).toBe(0.5);
    // 역방향은 LINK 가 없으므로 파생 SIBLING
    expect(graph.edgeTypeMap?.get(b.id)?.get(a.id)).toBe('SIBLING');
  });

  it('구형 인덱스의 물질화된 SIBLING 엣지와 중복 없이 병합된다', () => {
    const a = makeNode('02_Derived/a.md');
    const b = makeNode('02_Derived/b.md');
    // 하한 도입 이전 직렬화본: SIBLING 이 edges 에 물질화되어 있음
    const legacy = makeGraph(
      [a, b],
      [
        { from: a.id, to: b.id, type: 'SIBLING', weight: 0.5 },
        { from: b.id, to: a.id, type: 'SIBLING', weight: 0.5 },
      ],
    );
    hydrateRuntimeMaps(legacy);

    expect(legacy.adjacencyList?.get(a.id)).toEqual([b.id]); // 이웃 1회 등록
    expect(legacy.edgeTypeMap?.get(a.id)?.get(b.id)).toBe('SIBLING');
  });

  it('구형(물질화) 그래프와 신형(파생) 그래프의 SA 결과가 동일하다', () => {
    const paths = [
      '04_Action/bulk/a.md',
      '04_Action/bulk/b.md',
      '04_Action/bulk/c.md',
      '02_Derived/hub.md',
    ];
    const buildNodes = () =>
      paths.map((p) =>
        makeNode(p, p.startsWith('04_') ? Layer.L4_ACTION : Layer.L2_DERIVED),
      );
    const link: KnowledgeEdge = {
      from: toNodeId('04_Action/bulk/a.md'),
      to: toNodeId('02_Derived/hub.md'),
      type: 'LINK',
      weight: 0.5,
    };
    const bulkSibling = (from: string, to: string): KnowledgeEdge => ({
      from: toNodeId(from),
      to: toNodeId(to),
      type: 'SIBLING',
      weight: 2 / 3,
    });

    const legacyNodes = buildNodes();
    const legacy = makeGraph(legacyNodes, [
      link,
      bulkSibling('04_Action/bulk/a.md', '04_Action/bulk/b.md'),
      bulkSibling('04_Action/bulk/b.md', '04_Action/bulk/a.md'),
      bulkSibling('04_Action/bulk/a.md', '04_Action/bulk/c.md'),
      bulkSibling('04_Action/bulk/c.md', '04_Action/bulk/a.md'),
      bulkSibling('04_Action/bulk/b.md', '04_Action/bulk/c.md'),
      bulkSibling('04_Action/bulk/c.md', '04_Action/bulk/b.md'),
    ]);
    const modern = makeGraph(buildNodes(), [link]);
    hydrateRuntimeMaps(legacy);
    hydrateRuntimeMaps(modern);

    const seeds = [toNodeId('04_Action/bulk/a.md')];
    const params = { iterations: 3, maxActiveNodes: 50 };
    expect(runAccumulativeActivation(modern, seeds, params)).toEqual(
      runAccumulativeActivation(legacy, seeds, params),
    );
  });
});
