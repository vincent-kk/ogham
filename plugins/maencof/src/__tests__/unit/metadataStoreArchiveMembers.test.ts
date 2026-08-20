/**
 * @file metadataStoreArchiveMembers.test.ts
 * @description archive-members.json 샤드 왕복 + 샤드 부재(구버전 캐시)·손상 시 그래프 로드 호환 검증.
 */
import { mkdirSync, rmSync } from 'node:fs';
import { unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { MetadataStore } from '../../core/indexer/metadataStore/index.js';
import { Layer, toNodeId } from '../../types/common.js';
import type { KnowledgeGraph, KnowledgeNode } from '../../types/graph.js';

/** 노드 1건짜리 최소 그래프 — kgSearchResponse.test.ts 의 makeNode 패턴 축약 */
function makeMinimalGraph(): KnowledgeGraph {
  const id = toNodeId('04_Action/a.md');
  const node: KnowledgeNode = {
    id,
    path: '04_Action/a.md',
    title: 'a',
    layer: Layer.L4_ACTION,
    tags: [],
    created: '2026-08-05',
    updated: '2026-08-05',
    mtime: 0,
    accessed_count: 0,
  };
  return {
    nodes: new Map([[id, node]]),
    edges: [],
    builtAt: new Date().toISOString(),
    nodeCount: 1,
    edgeCount: 0,
  };
}

let vault: string;
let store: MetadataStore;

beforeEach(() => {
  vault = join(
    tmpdir(),
    `maencof-archive-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(join(vault, '.maencof'), { recursive: true });
  store = new MetadataStore(vault);
});

afterEach(() => {
  rmSync(vault, { recursive: true, force: true, maxRetries: 3 });
});

describe('MetadataStore archive-members 샤드', () => {
  it('saveGraph → loadGraph 왕복에서 archiveClusterMembers 가 값·정렬까지 보존된다', async () => {
    const graph = makeMinimalGraph();
    graph.archiveClusterMembers = new Map([
      [
        'geeknews',
        [
          {
            clusterKey: 'geeknews',
            path: '99_Archive/geeknews/gn-2.md',
            title: 'B',
            updated: '2026-08-20',
            tags: ['t'],
          },
          {
            clusterKey: 'geeknews',
            path: '99_Archive/geeknews/gn-1.md',
            title: 'A',
            updated: '2026-08-01',
            tags: [],
          },
        ],
      ],
    ]);
    await store.saveGraph(graph);
    const loaded = await store.loadGraph();
    expect(loaded?.archiveClusterMembers?.get('geeknews')).toEqual(
      graph.archiveClusterMembers.get('geeknews'),
    );
  });

  it('archive-members.json 이 없는 캐시(구버전)도 그래프 로드가 성공하고 필드는 미설정이다', async () => {
    await store.saveGraph(makeMinimalGraph());
    await unlink(join(vault, '.maencof', 'archive-members.json'));
    const loaded = await store.loadGraph();
    expect(loaded).not.toBeNull();
    expect(loaded?.archiveClusterMembers).toBeUndefined();
  });

  it('archive-members.json 이 손상돼도 그래프 로드는 계속된다', async () => {
    await store.saveGraph(makeMinimalGraph());
    await writeFile(
      join(vault, '.maencof', 'archive-members.json'),
      '{not json',
      'utf-8',
    );
    const loaded = await store.loadGraph();
    expect(loaded).not.toBeNull();
    expect(loaded?.archiveClusterMembers).toBeUndefined();
  });
});
