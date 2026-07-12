/**
 * @file linkWeightFloor.test.ts
 * @description LINK 저장 가중치 하한 — cross-folder 사용자 위키링크가 저장 계층에서
 * SCS 0 으로 소실되지 않음을 보장 (LINK_WEIGHT_FLOOR, LINK 전용).
 */
import { describe, expect, it } from 'vitest';

import { LINK_WEIGHT_FLOOR } from '../../constants/weights.js';
import { calculateWeights } from '../../core/weightCalculator/index.js';
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

describe('LINK weight floor', () => {
  it('최상위 폴더를 가로지르는 LINK 는 SCS 0 대신 하한으로 저장된다', () => {
    const a = makeNode('04_Action/geeknews/gn-1.md', Layer.L4_ACTION);
    const b = makeNode('02_Derived/topic.md');
    const graph = makeGraph(
      [a, b],
      [{ from: a.id, to: b.id, type: 'LINK', weight: 1.0 }],
    );
    const { edges } = calculateWeights(graph);
    expect(edges[0].weight).toBe(LINK_WEIGHT_FLOOR);
  });

  it('동일 폴더 LINK 는 하한보다 큰 SCS 가중치를 유지한다', () => {
    const a = makeNode('02_Derived/topic/a.md');
    const b = makeNode('02_Derived/topic/b.md');
    const graph = makeGraph(
      [a, b],
      [{ from: a.id, to: b.id, type: 'LINK', weight: 1.0 }],
    );
    const { edges } = calculateWeights(graph);
    expect(edges[0].weight).toBeCloseTo(2 / 3, 5);
    expect(edges[0].weight).toBeGreaterThan(LINK_WEIGHT_FLOOR);
  });

  it('하한은 LINK 전용이다 — DOMAIN 고정 가중치(0.3)는 하한 미적용', () => {
    const a = makeNode('01_Core/a.md', Layer.L1_CORE);
    const b = makeNode('02_Derived/b.md');
    const graph = makeGraph(
      [a, b],
      [{ from: a.id, to: b.id, type: 'DOMAIN', weight: 0.3 }],
    );
    const { edges } = calculateWeights(graph);
    expect(edges[0].weight).toBeCloseTo(0.3, 5);
    expect(edges[0].weight).toBeLessThan(LINK_WEIGHT_FLOOR);
  });
});
