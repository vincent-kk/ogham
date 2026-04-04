import { describe, expect, it } from 'vitest';

import { buildGraph } from '../../core/graph-builder/graph-builder.js';
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

describe('buildCrossLayerEdges', () => {
  it('boundary 노드가 없으면 CROSS_LAYER 엣지 0개', () => {
    const nodes = [
      makeNode('01_Core/a.md', Layer.L1_CORE, ['test']),
      makeNode('03_External/b.md', Layer.L3_EXTERNAL, ['test']),
    ];
    const { graph } = buildGraph(nodes);
    const crossEdges = graph.edges.filter((e) => e.type === 'CROSS_LAYER');
    expect(crossEdges).toHaveLength(0);
  });

  it('boundary 노드가 connected_layers의 태그 겹침 노드에만 엣지 생성', () => {
    const boundary = makeNode(
      '05_Context/boundary/moc.md',
      Layer.L5_CONTEXT,
      ['react', 'frontend'],
      {
        subLayer: 'boundary',
        connectedLayers: [1, 3],
        boundaryType: 'project_moc',
      },
    );
    const l1Match = makeNode('01_Core/react-identity.md', Layer.L1_CORE, [
      'react',
    ]);
    const l1NoMatch = makeNode('01_Core/python.md', Layer.L1_CORE, ['python']);
    const l3Match = makeNode('03_External/frontend-lib.md', Layer.L3_EXTERNAL, [
      'frontend',
    ]);
    const l2NoConnect = makeNode(
      '02_Derived/react-notes.md',
      Layer.L2_DERIVED,
      ['react'],
    ); // L2 not in connected_layers

    const nodes = [boundary, l1Match, l1NoMatch, l3Match, l2NoConnect];
    const { graph } = buildGraph(nodes);
    const crossEdges = graph.edges.filter((e) => e.type === 'CROSS_LAYER');

    // l1Match (L1, tag=react matches) → 2 edges (bidirectional)
    // l3Match (L3, tag=frontend matches) → 2 edges (bidirectional)
    // l1NoMatch (L1, tag=python no match) → 0
    // l2NoConnect (L2, not in connected_layers) → 0
    expect(crossEdges).toHaveLength(4);

    const fromBoundary = crossEdges.filter(
      (e) => e.from === toNodeId('05_Context/boundary/moc.md'),
    );
    expect(fromBoundary).toHaveLength(2);
  });

  it('MAX_CROSS_LAYER_EDGES_PER_NODE=50 캡 적용', () => {
    const boundary = makeNode(
      '05_Context/boundary/big.md',
      Layer.L5_CONTEXT,
      ['common'],
      {
        subLayer: 'boundary',
        connectedLayers: [1],
        boundaryType: 'hub',
      },
    );

    // 60개의 L1 노드 (모두 'common' 태그 → 모두 매칭)
    const l1Nodes = Array.from({ length: 60 }, (_, i) =>
      makeNode(`01_Core/node-${i}.md`, Layer.L1_CORE, ['common']),
    );

    const nodes = [boundary, ...l1Nodes];
    const { graph } = buildGraph(nodes);
    const crossEdges = graph.edges.filter((e) => e.type === 'CROSS_LAYER');

    // Max 50 connections → 100 edges (bidirectional)
    expect(crossEdges.length).toBeLessThanOrEqual(100);
    const fromBoundary = crossEdges.filter(
      (e) => e.from === toNodeId('05_Context/boundary/big.md'),
    );
    expect(fromBoundary.length).toBeLessThanOrEqual(50);
  });

  it('CROSS_LAYER 엣지가 기존 엣지 타입과 공존', () => {
    const boundary = makeNode(
      '05_Context/boundary/moc.md',
      Layer.L5_CONTEXT,
      ['test'],
      {
        subLayer: 'boundary',
        connectedLayers: [1],
        boundaryType: 'moc',
      },
    );
    const l1 = makeNode('01_Core/a.md', Layer.L1_CORE, ['test']);
    const l1b = makeNode('01_Core/b.md', Layer.L1_CORE, ['other']);

    const nodes = [boundary, l1, l1b];
    const { graph } = buildGraph(nodes);

    const edgeTypes = new Set(graph.edges.map((e) => e.type));
    // SIBLING between l1 and l1b, CROSS_LAYER from boundary to l1
    expect(edgeTypes.has('SIBLING')).toBe(true);
    expect(edgeTypes.has('CROSS_LAYER')).toBe(true);
  });

  it('고립 노드 탐지가 CROSS_LAYER 엣지와 함께 올바르게 동작', () => {
    const boundary = makeNode(
      '05_Context/boundary/moc.md',
      Layer.L5_CONTEXT,
      ['test'],
      {
        subLayer: 'boundary',
        connectedLayers: [1],
        boundaryType: 'moc',
      },
    );
    const l1 = makeNode('01_Core/a.md', Layer.L1_CORE, ['test']);
    const orphan = makeNode('04_Action/orphan.md', Layer.L4_ACTION, ['solo']);

    const { orphanNodes } = buildGraph([boundary, l1, orphan]);
    expect(orphanNodes).toContain(toNodeId('04_Action/orphan.md'));
    expect(orphanNodes).not.toContain(toNodeId('05_Context/boundary/moc.md'));
    expect(orphanNodes).not.toContain(toNodeId('01_Core/a.md'));
  });
});
