/**
 * @file graph-relationship.test.ts
 * @description GraphBuilder RELATIONSHIP 엣지 생성 단위 테스트
 */
import { describe, expect, it } from 'vitest';

import { buildGraph } from '../../core/graph-builder.js';
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

describe('RELATIONSHIP 엣지 생성', () => {
  function makePersonNode(
    path: string,
    relationshipType: string,
    domain?: string,
    layer: Layer = Layer.L4_ACTION,
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
      person: { relationship_type: relationshipType, intimacy_level: 3 },
      ...(domain ? { domain } : {}),
    } as KnowledgeNode;
  }

  it('person frontmatter가 있는 두 노드에 RELATIONSHIP 엣지가 생성된다', () => {
    const alice = makePersonNode('04_Action/alice.md', 'friend');
    const bob = makePersonNode('04_Action/bob.md', 'friend');
    const { graph } = buildGraph([alice, bob]);
    const relEdges = graph.edges.filter((e) => e.type === 'RELATIONSHIP');
    expect(relEdges.length).toBeGreaterThan(0);
  });

  it('friend 관계는 양방향 엣지를 생성한다', () => {
    const alice = makePersonNode('04_Action/alice.md', 'friend');
    const bob = makePersonNode('04_Action/bob.md', 'friend');
    const { graph } = buildGraph([alice, bob]);
    const relEdges = graph.edges.filter((e) => e.type === 'RELATIONSHIP');
    const aToB = relEdges.some((e) => e.from === alice.id && e.to === bob.id);
    const bToA = relEdges.some((e) => e.from === bob.id && e.to === alice.id);
    expect(aToB).toBe(true);
    expect(bToA).toBe(true);
  });

  it('mentor 관계는 단방향 엣지만 생성한다', () => {
    const alice = makePersonNode('04_Action/alice.md', 'mentor');
    const bob = makePersonNode('04_Action/bob.md', 'colleague');
    const { graph } = buildGraph([alice, bob]);
    const relEdges = graph.edges.filter((e) => e.type === 'RELATIONSHIP');
    const aToB = relEdges.some((e) => e.from === alice.id && e.to === bob.id);
    const bToA = relEdges.some((e) => e.from === bob.id && e.to === alice.id);
    expect(aToB).toBe(true);
    expect(bToA).toBe(false);
  });

  it('person frontmatter가 없는 노드에는 RELATIONSHIP 엣지가 생성되지 않는다', () => {
    const a = makeNode('01_Core/a.md', Layer.L1_CORE);
    const b = makeNode('02_Derived/b.md');
    const { graph } = buildGraph([a, b]);
    const relEdges = graph.edges.filter((e) => e.type === 'RELATIONSHIP');
    expect(relEdges).toHaveLength(0);
  });

  it('동일 domain 태그를 가진 노드 간 약한 LINK 엣지(weight=0.3)가 생성된다', () => {
    const a = {
      ...makeNode('01_Core/a.md', Layer.L1_CORE),
      domain: 'AI',
    } as KnowledgeNode;
    const b = { ...makeNode('02_Derived/b.md'), domain: 'AI' } as KnowledgeNode;
    const { graph } = buildGraph([a, b]);
    const domainEdges = graph.edges.filter(
      (e) => e.type === 'LINK' && e.weight === 0.3,
    );
    expect(domainEdges.length).toBeGreaterThan(0);
  });
});
