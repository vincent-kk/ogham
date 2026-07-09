/**
 * @file metadataStoreMigration.test.ts
 * @description saveGraph/loadGraph 3-shard layout + legacy index.json one-shot migration 검증.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { MetadataStore } from '../../core/indexer/metadataStore/index.js';
import type { NodeId } from '../../types/common.js';
import { toNodeId } from '../../types/common.js';
import type { KnowledgeGraph, KnowledgeNode } from '../../types/graph.js';

let vaultDir: string;
let cacheDir: string;

beforeEach(() => {
  vaultDir = join(
    tmpdir(),
    `migrate-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  cacheDir = join(vaultDir, '.maencof');
  mkdirSync(cacheDir, { recursive: true });
});

afterEach(() => {
  rmSync(vaultDir, { recursive: true, force: true, maxRetries: 3 });
});

function makeMinimalGraph(): KnowledgeGraph {
  const id = toNodeId('doc/a.md');
  const nodes = new Map<NodeId, KnowledgeNode>();
  nodes.set(id, {
    id,
    path: 'doc/a.md',
    title: 'A',
    layer: 2,
    tags: ['t'],
    created: '2026-01-01',
    updated: '2026-01-01',
    mtime: 0,
    accessed_count: 0,
  });
  return {
    nodes,
    edges: [],
    builtAt: '2026-01-01T00:00:00Z',
    nodeCount: 1,
    edgeCount: 0,
  };
}

describe('MetadataStore.saveGraph 샤드 layout', () => {
  it('3 파일(nodes/edges/graph-meta)을 모두 생성한다', async () => {
    const store = new MetadataStore(vaultDir);
    await store.saveGraph(makeMinimalGraph());

    expect(existsSync(join(cacheDir, 'nodes.json'))).toBe(true);
    expect(existsSync(join(cacheDir, 'edges.json'))).toBe(true);
    expect(existsSync(join(cacheDir, 'graph-meta.json'))).toBe(true);
  });

  it('graph-meta.json 은 schemaVersion: 2 와 builtAt/nodeCount/edgeCount 를 담는다', async () => {
    const store = new MetadataStore(vaultDir);
    await store.saveGraph(makeMinimalGraph());

    const meta = JSON.parse(
      readFileSync(join(cacheDir, 'graph-meta.json'), 'utf-8'),
    ) as {
      schemaVersion: number;
      builtAt: string;
      nodeCount: number;
      edgeCount: number;
    };
    expect(meta.schemaVersion).toBe(2);
    expect(meta.builtAt).toBe('2026-01-01T00:00:00Z');
    expect(meta.nodeCount).toBe(1);
    expect(meta.edgeCount).toBe(0);
  });

  it('legacy index.json 이 잔존해 있으면 saveGraph 가 정리한다', async () => {
    writeFileSync(
      join(cacheDir, 'index.json'),
      JSON.stringify({
        nodes: [],
        edges: [],
        builtAt: 'x',
        nodeCount: 0,
        edgeCount: 0,
      }),
      'utf-8',
    );
    expect(existsSync(join(cacheDir, 'index.json'))).toBe(true);

    const store = new MetadataStore(vaultDir);
    await store.saveGraph(makeMinimalGraph());

    expect(existsSync(join(cacheDir, 'index.json'))).toBe(false);
  });
});

describe('MetadataStore.loadGraph 샤드 round-trip', () => {
  it('saveGraph 직후 loadGraph 는 동일한 노드/엣지/메타를 복원한다', async () => {
    const store = new MetadataStore(vaultDir);
    const original = makeMinimalGraph();
    await store.saveGraph(original);

    const loaded = await store.loadGraph();
    expect(loaded).not.toBeNull();
    expect(loaded?.nodes.size).toBe(1);
    expect(loaded?.edges).toEqual([]);
    expect(loaded?.builtAt).toBe('2026-01-01T00:00:00Z');
    expect(loaded?.nodeCount).toBe(1);
    expect(loaded?.edgeCount).toBe(0);
  });

  it('graph-meta.json 만 누락되면 cache miss 로 처리(null)', async () => {
    const store = new MetadataStore(vaultDir);
    await store.saveGraph(makeMinimalGraph());
    rmSync(join(cacheDir, 'graph-meta.json'), { force: true });

    const loaded = await store.loadGraph();
    expect(loaded).toBeNull();
  });

  it('샤드/legacy 모두 부재 시 null', async () => {
    const store = new MetadataStore(vaultDir);
    const loaded = await store.loadGraph();
    expect(loaded).toBeNull();
  });
});

describe('MetadataStore.loadGraph legacy 자동 마이그레이션', () => {
  function writeLegacyIndex(): void {
    const node = {
      id: 'doc/legacy.md',
      path: 'doc/legacy.md',
      title: 'Legacy',
      layer: 1,
      tags: [],
      created: '2026-01-01',
      updated: '2026-01-01',
      mtime: 0,
      accessed_count: 0,
    };
    writeFileSync(
      join(cacheDir, 'index.json'),
      JSON.stringify({
        nodes: [node],
        edges: [],
        builtAt: '2025-12-31T00:00:00Z',
        nodeCount: 1,
        edgeCount: 0,
      }),
      'utf-8',
    );
  }

  it('legacy index.json 만 있는 vault 는 첫 loadGraph 시 샤드로 마이그레이션된다', async () => {
    writeLegacyIndex();
    expect(existsSync(join(cacheDir, 'nodes.json'))).toBe(false);

    const store = new MetadataStore(vaultDir);
    const loaded = await store.loadGraph();

    expect(loaded).not.toBeNull();
    expect(loaded?.nodes.size).toBe(1);
    // 샤드 파일이 새로 생성됨
    expect(existsSync(join(cacheDir, 'nodes.json'))).toBe(true);
    expect(existsSync(join(cacheDir, 'edges.json'))).toBe(true);
    expect(existsSync(join(cacheDir, 'graph-meta.json'))).toBe(true);
    // legacy 파일은 제거됨
    expect(existsSync(join(cacheDir, 'index.json'))).toBe(false);
  });

  it('마이그레이션 이후 두 번째 loadGraph 는 fast path 로 동일 결과를 반환', async () => {
    writeLegacyIndex();
    const store = new MetadataStore(vaultDir);
    const first = await store.loadGraph();
    const second = await store.loadGraph();

    expect(first?.nodes.size).toBe(second?.nodes.size);
    expect(first?.builtAt).toBe(second?.builtAt);
  });
});

describe('MetadataStore.cacheExists', () => {
  it('graph-meta.json 만 있으면 true', async () => {
    const store = new MetadataStore(vaultDir);
    await store.saveGraph(makeMinimalGraph());
    expect(await store.cacheExists()).toBe(true);
  });

  it('legacy index.json 만 있어도 true', async () => {
    writeFileSync(
      join(cacheDir, 'index.json'),
      JSON.stringify({
        nodes: [],
        edges: [],
        builtAt: '',
        nodeCount: 0,
        edgeCount: 0,
      }),
      'utf-8',
    );
    const store = new MetadataStore(vaultDir);
    expect(await store.cacheExists()).toBe(true);
  });

  it('아무 캐시도 없으면 false', async () => {
    const store = new MetadataStore(vaultDir);
    expect(await store.cacheExists()).toBe(false);
  });
});
