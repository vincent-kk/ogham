/**
 * @file partial-reindex-hybrid.test.ts
 * @description Hybrid partial reindex: node 교체/삭제 + outbound edge 재계산 + invertedIndex 동기.
 * weights/PR 미갱신은 그대로 검증.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MetadataStore } from '../../../core/indexer/metadata-store/metadata-store.js';
import { mergeStaleNodesIntoGraph } from '../../../mcp/server/middlewares/partial-reindex.js';
import * as queryEngine from '../../../search/query-engine/query-engine.js';
import type { InvertedIndex, KnowledgeGraph, KnowledgeNode } from '../../../types/graph.js';
import type { NodeId } from '../../../types/common.js';

let vaultDir: string;

function writeMarkdown(relPath: string, body: string): void {
  const abs = join(vaultDir, relPath);
  mkdirSync(join(abs, '..'), { recursive: true });
  writeFileSync(abs, body, 'utf-8');
}

function makeNode(path: string, title = path): KnowledgeNode {
  return {
    id: path as NodeId,
    path,
    title,
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
  it('mutate entry 는 stale path 의 node 를 새 데이터로 교체한다', async () => {
    const aOld = makeNode('a.md', 'OLD');
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
    await store.appendStaleEntries([{ path: 'a.md', op: 'mutate' }]);

    await mergeStaleNodesIntoGraph(vaultDir, graph);
    const after = graph.nodes.get('a.md' as NodeId);
    expect(after?.title).toBe('NEW');
  });

  it('outbound edges 가 stale source 기준으로 재계산된다', async () => {
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

    // a.md 신규 본문이 b.md 를 더 이상 가리키지 않음 → edge 제거되어야 함
    writeMarkdown(
      'a.md',
      `---\nlayer: 2\ntags: [t]\ncreated: 2026-01-01\nupdated: 2026-01-01\n---\n# A\nno links here\n`,
    );
    const store = new MetadataStore(vaultDir);
    await store.appendStaleEntries([{ path: 'a.md', op: 'mutate' }]);

    await mergeStaleNodesIntoGraph(vaultDir, graph);
    expect(graph.edges.find((e) => e.from === 'a.md')).toBeUndefined();
  });

  it('weights / pageRank / edgeWeightMap 는 갱신되지 않는다 (background rebuild 의존)', async () => {
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
    await store.appendStaleEntries([{ path: 'a.md', op: 'mutate' }]);

    await mergeStaleNodesIntoGraph(vaultDir, graph);
    expect(graph.edgeWeightMap?.get('a.md' as NodeId)?.get('x' as NodeId)).toBe(0.7);
    expect(graph.adjacencyList?.get('a.md' as NodeId)).toEqual(['x']);
  });

  it('delete entry 는 graph nodes / 양방향 incident edges / invertedIndex 모두에서 제거한다', async () => {
    const a = makeNode('a.md', 'Alpha');
    const b = makeNode('b.md', 'Beta');
    const invertedIndex: InvertedIndex = new Map([
      ['alpha', new Set<NodeId>(['a.md' as NodeId])],
      ['t', new Set<NodeId>(['a.md' as NodeId, 'b.md' as NodeId])],
    ]);
    const graph: KnowledgeGraph = {
      nodes: new Map([
        [a.id, a],
        [b.id, b],
      ]),
      edges: [
        { from: 'a.md' as NodeId, to: 'b.md' as NodeId, type: 'LINK', weight: 1 },
        { from: 'b.md' as NodeId, to: 'a.md' as NodeId, type: 'LINK', weight: 1 },
      ],
      builtAt: '2026-01-01',
      nodeCount: 2,
      edgeCount: 2,
      invertedIndex,
    };

    await mergeStaleNodesIntoGraph(vaultDir, graph, [
      { path: 'a.md', op: 'delete' },
    ]);

    expect(graph.nodes.has('a.md' as NodeId)).toBe(false);
    expect(graph.edges.find((e) => e.from === 'a.md' || e.to === 'a.md')).toBeUndefined();
    expect(graph.invertedIndex?.get('alpha')).toBeUndefined();
    expect(graph.invertedIndex?.get('t')?.has('a.md' as NodeId)).toBe(false);
    expect(graph.invertedIndex?.get('t')?.has('b.md' as NodeId)).toBe(true);
  });

  it('mutate entry 는 invertedIndex 의 옛 term 을 제거하고 신 term 을 추가한다', async () => {
    const aOld = makeNode('a.md', 'Alpha');
    const invertedIndex: InvertedIndex = new Map([
      ['alpha', new Set<NodeId>(['a.md' as NodeId])],
      ['t', new Set<NodeId>(['a.md' as NodeId])],
    ]);
    const graph: KnowledgeGraph = {
      nodes: new Map([[aOld.id, aOld]]),
      edges: [],
      builtAt: '2026-01-01',
      nodeCount: 1,
      edgeCount: 0,
      invertedIndex,
    };

    writeMarkdown(
      'a.md',
      `---\nlayer: 2\ntags: [renamed]\ncreated: 2026-01-01\nupdated: 2026-01-01\n---\n# Beta\nbody\n`,
    );

    await mergeStaleNodesIntoGraph(vaultDir, graph, [
      { path: 'a.md', op: 'mutate' },
    ]);

    // 옛 title term 'alpha' 는 사라져야 함 (Set 비면 term 자체 삭제)
    expect(graph.invertedIndex?.get('alpha')).toBeUndefined();
    // 옛 tag 't' 는 사라지고 새 tag 'renamed' 가 등장
    expect(graph.invertedIndex?.get('t')).toBeUndefined();
    expect(graph.invertedIndex?.get('renamed')?.has('a.md' as NodeId)).toBe(true);
    // 새 title term 'beta' 가 등장
    expect(graph.invertedIndex?.get('beta')?.has('a.md' as NodeId)).toBe(true);
  });

  it('mutate entry 의 ENOENT 는 노드 삭제로 해석되지 않는다 (race 보호)', async () => {
    const aOld = makeNode('a.md', 'Alpha');
    const graph: KnowledgeGraph = {
      nodes: new Map([[aOld.id, aOld]]),
      edges: [],
      builtAt: '2026-01-01',
      nodeCount: 1,
      edgeCount: 0,
    };
    // 디스크에 파일을 만들지 않음 → readFile ENOENT
    await mergeStaleNodesIntoGraph(vaultDir, graph, [
      { path: 'a.md', op: 'mutate' },
    ]);
    expect(graph.nodes.has('a.md' as NodeId)).toBe(true);
  });
});

describe('mergeStaleNodesIntoGraph queryCache invalidation', () => {
  let invalidateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    invalidateSpy = vi.spyOn(queryEngine, 'invalidateQueryCache');
  });

  afterEach(() => {
    invalidateSpy.mockRestore();
  });

  it('basic-1: stale entries 0개일 때 invalidateQueryCache 가 호출되지 않는다', async () => {
    const graph: KnowledgeGraph = {
      nodes: new Map(),
      edges: [],
      builtAt: '2026-01-01',
      nodeCount: 0,
      edgeCount: 0,
    };
    await mergeStaleNodesIntoGraph(vaultDir, graph, []);
    expect(invalidateSpy).toHaveBeenCalledTimes(0);
  });

  it('complex-1: mutate 한 건 적용 시 invalidateQueryCache 가 정확히 1회 호출된다', async () => {
    const aOld = makeNode('a.md', 'OLD');
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
    await mergeStaleNodesIntoGraph(vaultDir, graph, [
      { path: 'a.md', op: 'mutate' },
    ]);
    expect(invalidateSpy).toHaveBeenCalledTimes(1);
  });

  it('complex-2: delete 한 건 적용 시 invalidateQueryCache 가 정확히 1회 호출된다', async () => {
    const a = makeNode('a.md', 'Alpha');
    const graph: KnowledgeGraph = {
      nodes: new Map([[a.id, a]]),
      edges: [],
      builtAt: '2026-01-01',
      nodeCount: 1,
      edgeCount: 0,
    };
    await mergeStaleNodesIntoGraph(vaultDir, graph, [
      { path: 'a.md', op: 'delete' },
    ]);
    expect(invalidateSpy).toHaveBeenCalledTimes(1);
  });

  it('complex-3: mutate 가 ENOENT 로 모두 skip 되어 changed=0 인 경우 invalidateQueryCache 호출 0회', async () => {
    const aOld = makeNode('a.md', 'Alpha');
    const graph: KnowledgeGraph = {
      nodes: new Map([[aOld.id, aOld]]),
      edges: [],
      builtAt: '2026-01-01',
      nodeCount: 1,
      edgeCount: 0,
    };
    // 디스크에 파일 없음 → readFile ENOENT → mutate 모두 skip
    await mergeStaleNodesIntoGraph(vaultDir, graph, [
      { path: 'a.md', op: 'mutate' },
    ]);
    expect(invalidateSpy).toHaveBeenCalledTimes(0);
  });

  it('complex-4: mutate 직후 query 호출이 pre-merge cache 결과를 반환하지 않는다', async () => {
    // 동일 builtAt 의 in-place mutation 이라도 invalidateQueryCache 가 자동 호출되어
    // 후속 query 가 post-merge graph 구조로 재실행된다.
    const aOld = makeNode('a.md', 'Alpha');
    const graph: KnowledgeGraph = {
      nodes: new Map([[aOld.id, aOld]]),
      edges: [],
      builtAt: '2026-01-01',
      nodeCount: 1,
      edgeCount: 0,
      invertedIndex: new Map([
        ['alpha', new Set<NodeId>(['a.md' as NodeId])],
      ]),
    };

    // 사전 query 1회 → cache 저장
    const before = queryEngine.query(graph, ['alpha']);
    expect(before.results.map((r) => r.nodeId)).toContain('a.md' as NodeId);

    // delete entry 적용 → invalidate 호출 기대
    await mergeStaleNodesIntoGraph(vaultDir, graph, [
      { path: 'a.md', op: 'delete' },
    ]);
    expect(invalidateSpy).toHaveBeenCalledTimes(1);

    // 두 번째 query — graph 가 비었으므로 결과 0
    const after = queryEngine.query(graph, ['alpha']);
    expect(after.results.length).toBe(0);
  });
});
