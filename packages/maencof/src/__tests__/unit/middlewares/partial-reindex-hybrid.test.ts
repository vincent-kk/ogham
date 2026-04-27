/**
 * @file partial-reindex-hybrid.test.ts
 * @description Hybrid partial reindex: node 교체 + outbound edge 재계산, weights/PR 미갱신 검증.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { MetadataStore } from '../../../core/indexer/metadata-store/metadata-store.js';
import { mergeStaleNodesIntoGraph } from '../../../mcp/server/middlewares/partial-reindex.js';
import type { KnowledgeGraph, KnowledgeNode } from '../../../types/graph.js';
import type { NodeId } from '../../../types/common.js';

let vaultDir: string;

function writeMarkdown(relPath: string, body: string): void {
  const abs = join(vaultDir, relPath);
  mkdirSync(join(abs, '..'), { recursive: true });
  writeFileSync(abs, body, 'utf-8');
}

function makeNode(path: string, body = ''): KnowledgeNode {
  return {
    id: path as NodeId,
    path,
    title: path,
    layer: 2,
    tags: ['t'],
    created: '2026-01-01',
    updated: '2026-01-01',
    mtime: 0,
    accessed_count: 0,
    person: undefined,
    domain: undefined,
    outboundLinks: undefined,
  } as unknown as KnowledgeNode;
}

beforeEach(() => {
  vaultDir = join(
    tmpdir(),
    `maencof-hybrid-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(join(vaultDir, '.maencof'), { recursive: true });
});

afterEach(() => {
  rmSync(vaultDir, { recursive: true, force: true, maxRetries: 3 });
});

describe('mergeStaleNodesIntoGraph (Hybrid)', () => {
  it('stale path의 node를 새 데이터로 교체한다', async () => {
    const aOld = makeNode('a.md');
    aOld.title = 'OLD';
    const graph: KnowledgeGraph = {
      nodes: new Map([[aOld.id, aOld]]),
      edges: [],
      builtAt: '2026-01-01',
      nodeCount: 1,
      edgeCount: 0,
    };

    writeMarkdown(
      'a.md',
      `---\nlayer: 2\ntags: [t]\ncreated: 2026-01-01\nupdated: 2026-01-01\n---\n# NEW\nbody\n`,
    );
    const store = new MetadataStore(vaultDir);
    await store.appendStaleNodes(['a.md']);

    await mergeStaleNodesIntoGraph(vaultDir, graph);
    const after = graph.nodes.get('a.md' as NodeId);
    expect(after?.title).toBe('NEW');
  });

  it('outbound edges가 stale source 기준으로 재계산된다', async () => {
    const a = makeNode('a.md');
    const b = makeNode('b.md');
    const graph: KnowledgeGraph = {
      nodes: new Map([
        [a.id, a],
        [b.id, b],
      ]),
      edges: [
        { from: 'a.md' as NodeId, to: 'b.md' as NodeId, type: 'LINK', weight: 0.5 },
      ],
      builtAt: '2026-01-01',
      nodeCount: 2,
      edgeCount: 1,
    };

    // a.md 신규 본문이 b.md를 더 이상 가리키지 않음 → edge 제거되어야 함
    writeMarkdown(
      'a.md',
      `---\nlayer: 2\ntags: [t]\ncreated: 2026-01-01\nupdated: 2026-01-01\n---\n# A\nno links here\n`,
    );
    const store = new MetadataStore(vaultDir);
    await store.appendStaleNodes(['a.md']);

    await mergeStaleNodesIntoGraph(vaultDir, graph);
    expect(graph.edges.find((e) => e.from === 'a.md')).toBeUndefined();
  });

  it('weights / pageRank / edgeWeightMap는 갱신되지 않는다 (background rebuild 의존)', async () => {
    const a = makeNode('a.md');
    a.pagerank = 0.42;
    const graph: KnowledgeGraph = {
      nodes: new Map([[a.id, a]]),
      edges: [],
      builtAt: '2026-01-01',
      nodeCount: 1,
      edgeCount: 0,
      edgeWeightMap: new Map([['a.md' as NodeId, new Map([['x' as NodeId, 0.7]])]]),
      adjacencyList: new Map([['a.md' as NodeId, ['x' as NodeId]]]),
    };

    writeMarkdown(
      'a.md',
      `---\nlayer: 2\ntags: [t]\ncreated: 2026-01-01\nupdated: 2026-01-01\n---\n# A\nbody\n`,
    );
    const store = new MetadataStore(vaultDir);
    await store.appendStaleNodes(['a.md']);

    await mergeStaleNodesIntoGraph(vaultDir, graph);
    // 직전 상태 그대로 보존 — partial reindex가 손대지 않음
    expect(graph.edgeWeightMap?.get('a.md' as NodeId)?.get('x' as NodeId)).toBe(0.7);
    expect(graph.adjacencyList?.get('a.md' as NodeId)).toEqual(['x']);
  });
});
