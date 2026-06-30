/**
 * @file mcpKgStatusLinkOrphan.test.ts
 * @description PP1 — kg_status 의 LINK(위키링크) 서브그래프 고립 진단 필드.
 */
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { handleKgStatus } from '../../mcp/tools/kgStatus/kgStatus.js';
import type { NodeId } from '../../types/common.js';
import type {
  KnowledgeEdge,
  KnowledgeGraph,
  KnowledgeNode,
} from '../../types/graph.js';

function node(id: string): KnowledgeNode {
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
  } as KnowledgeNode;
}

const vaultDir = join(tmpdir(), `maencof-linkorphan-${Math.random()}`);

describe('handleKgStatus — LINK orphan diagnosis', () => {
  it('counts LINK-subgraph isolation independently of SIBLING edges', async () => {
    const nodes = [node('a.md'), node('b.md'), node('c.md'), node('d.md')];
    const edges: KnowledgeEdge[] = [
      { from: 'a.md' as NodeId, to: 'b.md' as NodeId, type: 'LINK', weight: 1 },
      // c,d connected only by folder SIBLING — semantically isolated in LINK subgraph
      {
        from: 'c.md' as NodeId,
        to: 'd.md' as NodeId,
        type: 'SIBLING',
        weight: 0.75,
      },
      {
        from: 'd.md' as NodeId,
        to: 'c.md' as NodeId,
        type: 'SIBLING',
        weight: 0.75,
      },
    ];
    const graph: KnowledgeGraph = {
      nodes: new Map(nodes.map((n) => [n.id, n])),
      edges,
      builtAt: 't',
      nodeCount: nodes.length,
      edgeCount: edges.length,
    };

    const r = await handleKgStatus(vaultDir, graph, {});
    expect(r.linkOrphanCount).toBe(2); // c, d
    expect(r.linkInboundOrphanCount).toBe(3); // a, c, d (only b has inbound)
    expect(r.linkOutboundOrphanCount).toBe(3); // b, c, d (only a has outbound)
  });

  it('omits LINK orphan counts when the graph is null', async () => {
    const r = await handleKgStatus(vaultDir, null, {});
    expect(r.nodeCount).toBe(0);
    expect(r.linkOrphanCount).toBeUndefined();
  });
});
