/**
 * @file spreadingActivationFanout.test.ts
 * @description PP4 — SIBLING fanout 상한 + pagerank 타이브레이크.
 */
import { describe, expect, it } from 'vitest';

import { hydrateRuntimeMaps } from '../../core/graphBuilder/graphBuilder.js';
import { runSpreadingActivation } from '../../core/spreadingActivation/spreadingActivation.js';
import type { NodeId } from '../../types/common.js';
import type {
  KnowledgeEdge,
  KnowledgeGraph,
  KnowledgeNode,
} from '../../types/graph.js';

function node(id: string, pagerank = 0): KnowledgeNode {
  return {
    id: id as NodeId,
    path: id,
    title: id,
    layer: 2,
    tags: [],
    created: '2026-01-01',
    updated: '2026-01-01',
    mtime: 0,
    accessed_count: 0,
    pagerank,
  } as KnowledgeNode;
}

function cliqueGraph(siblingCount: number): KnowledgeGraph {
  const nodes: KnowledgeNode[] = [node('h.md')];
  const edges: KnowledgeEdge[] = [];
  for (let i = 0; i < siblingCount; i++) {
    nodes.push(node(`s${i}.md`, i));
    edges.push({
      from: 'h.md' as NodeId,
      to: `s${i}.md` as NodeId,
      type: 'SIBLING',
      weight: 0.75,
    });
    edges.push({
      from: `s${i}.md` as NodeId,
      to: 'h.md' as NodeId,
      type: 'SIBLING',
      weight: 0.75,
    });
  }
  const g: KnowledgeGraph = {
    nodes: new Map(nodes.map((n) => [n.id, n])),
    edges,
    builtAt: 't',
    nodeCount: nodes.length,
    edgeCount: edges.length,
  };
  hydrateRuntimeMaps(g);
  return g;
}

describe('runSpreadingActivation — sibling fanout cap', () => {
  it('caps sibling fanout to the top-k siblings by pagerank', () => {
    const g = cliqueGraph(10);
    const res = runSpreadingActivation(g, ['h.md' as NodeId], {
      maxHops: 1,
      threshold: 0.01,
      siblingFanoutCap: 3,
    });
    const reached = res
      .map((r) => r.nodeId)
      .filter((id) => id !== ('h.md' as NodeId));
    expect(reached.length).toBe(3);
    expect([...reached].sort()).toEqual(['s7.md', 's8.md', 's9.md']);
  });

  it('without a cap, the whole clique activates (regression guard)', () => {
    const g = cliqueGraph(10);
    const res = runSpreadingActivation(g, ['h.md' as NodeId], {
      maxHops: 1,
      threshold: 0.01,
    });
    expect(res.filter((r) => r.nodeId !== ('h.md' as NodeId)).length).toBe(10);
  });

  it('pagerank breaks ties among equal-score results', () => {
    const nodes = [node('h.md'), node('a.md', 0.1), node('b.md', 0.9)];
    const edges: KnowledgeEdge[] = [
      {
        from: 'h.md' as NodeId,
        to: 'a.md' as NodeId,
        type: 'SIBLING',
        weight: 0.75,
      },
      {
        from: 'h.md' as NodeId,
        to: 'b.md' as NodeId,
        type: 'SIBLING',
        weight: 0.75,
      },
    ];
    const g: KnowledgeGraph = {
      nodes: new Map(nodes.map((n) => [n.id, n])),
      edges,
      builtAt: 't',
      nodeCount: nodes.length,
      edgeCount: edges.length,
    };
    hydrateRuntimeMaps(g);
    const res = runSpreadingActivation(g, ['h.md' as NodeId], {
      maxHops: 1,
      threshold: 0.01,
    });
    const nonSeed = res.filter((r) => r.nodeId !== ('h.md' as NodeId));
    expect(nonSeed[0]!.nodeId).toBe('b.md');
  });
});
