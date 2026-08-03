/**
 * @file graphCrosslayer.test.ts
 * @description hub 속성 기반 CROSS_LAYER 엣지 생성.
 *
 * 허브는 레이어와 직교하므로 어느 레이어의 문서든 허브가 될 수 있고,
 * 대상 선정은 레이어 필터가 아니라 태그 겹침이다.
 */
import { describe, expect, it } from 'vitest';

import { buildGraph } from '../../core/graphBuilder/index.js';
import { Layer, toNodeId } from '../../types/common.js';
import type { KnowledgeNode } from '../../types/graph.js';

function makeNode(
  path: string,
  layer: Layer,
  tags: string[],
  extra?: Partial<KnowledgeNode>,
): KnowledgeNode {
  return {
    id: toNodeId(path),
    path,
    title: path,
    layer,
    tags,
    created: '2026-01-01',
    updated: '2026-03-04',
    mtime: 1000,
    accessed_count: 0,
    ...extra,
  };
}

function makeHub(path: string, layer: Layer, tags: string[]): KnowledgeNode {
  return makeNode(path, layer, tags, {
    hub: true,
    hubKind: 'project_moc',
    purpose: 'test hub',
  });
}

const HUB_PATH = '03_External/structural/moc.md';

describe('buildCrossLayerEdges', () => {
  it('허브 노드가 없으면 CROSS_LAYER 엣지 0개', () => {
    const { graph } = buildGraph([
      makeNode('01_Core/a.md', Layer.L1_CORE, ['test']),
      makeNode('03_External/b.md', Layer.L3_EXTERNAL, ['test']),
    ]);
    expect(graph.edges.filter((e) => e.type === 'CROSS_LAYER')).toHaveLength(0);
  });

  it('태그가 겹치는 노드에만 엣지를 만들고, 레이어는 가리지 않는다', () => {
    const hub = makeHub(HUB_PATH, Layer.L3_EXTERNAL, ['react', 'frontend']);
    const nodes = [
      hub,
      makeNode('01_Core/react-identity.md', Layer.L1_CORE, ['react']),
      makeNode('01_Core/python.md', Layer.L1_CORE, ['python']),
      makeNode('02_Derived/react-notes.md', Layer.L2_DERIVED, ['react']),
      makeNode('04_Action/frontend-task.md', Layer.L4_ACTION, ['frontend']),
    ];
    const { graph } = buildGraph(nodes);
    const crossEdges = graph.edges.filter((e) => e.type === 'CROSS_LAYER');

    // react-identity(L1) · react-notes(L2) · frontend-task(L4) 3건이 양방향 → 6
    // python(L1)은 태그가 겹치지 않아 제외
    expect(crossEdges).toHaveLength(6);
    expect(
      crossEdges.filter((e) => e.from === toNodeId(HUB_PATH)),
    ).toHaveLength(3);
  });

  it('허브 자신은 대상에서 제외된다', () => {
    const { graph } = buildGraph([
      makeHub(HUB_PATH, Layer.L3_EXTERNAL, ['solo']),
    ]);
    expect(graph.edges.filter((e) => e.type === 'CROSS_LAYER')).toHaveLength(0);
  });

  it('MAX_CROSS_LAYER_EDGES_PER_NODE=50 캡 적용', () => {
    const hub = makeHub('02_Derived/big.md', Layer.L2_DERIVED, ['common']);
    const others = Array.from({ length: 60 }, (_, i) =>
      makeNode(`01_Core/node-${i}.md`, Layer.L1_CORE, ['common']),
    );

    const { graph } = buildGraph([hub, ...others]);
    const fromHub = graph.edges.filter(
      (e) =>
        e.type === 'CROSS_LAYER' && e.from === toNodeId('02_Derived/big.md'),
    );
    expect(fromHub).toHaveLength(50);
  });

  it('캡에 걸리는 대상 선택이 입력 순서와 무관하게 결정적이다', () => {
    const hub = makeHub('02_Derived/big.md', Layer.L2_DERIVED, ['common']);
    const others = Array.from({ length: 60 }, (_, i) =>
      makeNode(`01_Core/node-${String(i).padStart(2, '0')}.md`, Layer.L1_CORE, [
        'common',
      ]),
    );

    const forward = buildGraph([hub, ...others]);
    const reversed = buildGraph([hub, ...[...others].reverse()]);
    const targets = (r: typeof forward): string[] =>
      r.graph.edges
        .filter(
          (e) =>
            e.type === 'CROSS_LAYER' &&
            e.from === toNodeId('02_Derived/big.md'),
        )
        .map((e) => e.to)
        .sort();

    expect(targets(forward)).toEqual(targets(reversed));
  });

  it('CROSS_LAYER 엣지가 기존 엣지 타입과 공존', () => {
    const { graph } = buildGraph([
      makeHub(HUB_PATH, Layer.L3_EXTERNAL, ['test']),
      makeNode('01_Core/a.md', Layer.L1_CORE, ['test']),
      makeNode('01_Core/b.md', Layer.L1_CORE, ['other']),
    ]);

    const edgeTypes = new Set(graph.edges.map((e) => e.type));
    // SIBLING 은 물질화되지 않는다 (hydrate 파생)
    expect(edgeTypes.has('SIBLING')).toBe(false);
    expect(edgeTypes.has('CROSS_LAYER')).toBe(true);
  });

  it('고립 노드 탐지가 CROSS_LAYER 엣지와 함께 올바르게 동작', () => {
    const { orphanNodes } = buildGraph([
      makeHub(HUB_PATH, Layer.L3_EXTERNAL, ['test']),
      makeNode('01_Core/a.md', Layer.L1_CORE, ['test']),
      makeNode('04_Action/orphan.md', Layer.L4_ACTION, ['solo']),
    ]);
    expect(orphanNodes).toContain(toNodeId('04_Action/orphan.md'));
    expect(orphanNodes).not.toContain(toNodeId(HUB_PATH));
    expect(orphanNodes).not.toContain(toNodeId('01_Core/a.md'));
  });
});
