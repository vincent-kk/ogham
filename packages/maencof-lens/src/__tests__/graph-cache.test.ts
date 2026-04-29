/**
 * @file graph-cache.test.ts
 * @description GraphCache.getGraph applies stale-nodes.json deltas to the
 *              cached graph in-memory each call, mirroring maencof's
 *              freshness-guard semantics for read-only consumers.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { stat, utimes } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { MetadataStore, READ_REINDEX_CAP } from '@ogham/maencof';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphCache } from '../vault/graph-cache/graph-cache.js';

interface ShardedNode {
  id: string;
  path: string;
  title: string;
  layer: number;
  tags: string[];
  created: string;
  updated: string;
  mtime: number;
  accessed_count: number;
}

let vaultDir: string;
let cache: GraphCache;

function makeNode(path: string, title: string = path): ShardedNode {
  return {
    id: path,
    path,
    title,
    layer: 2,
    tags: [],
    created: '2026-01-01',
    updated: '2026-01-01',
    mtime: 0,
    accessed_count: 0,
  };
}

function writeShardedGraph(nodes: ShardedNode[]): void {
  const cacheDir = join(vaultDir, '.maencof');
  writeFileSync(join(cacheDir, 'nodes.json'), JSON.stringify(nodes), 'utf-8');
  writeFileSync(join(cacheDir, 'edges.json'), JSON.stringify([]), 'utf-8');
  writeFileSync(
    join(cacheDir, 'graph-meta.json'),
    JSON.stringify({
      builtAt: '2026-01-01T00:00:00Z',
      nodeCount: nodes.length,
      edgeCount: 0,
      schemaVersion: 2,
    }),
    'utf-8',
  );
}

function writeStaleEntries(
  entries: { path: string; op: 'mutate' | 'delete' }[],
): void {
  writeFileSync(
    join(vaultDir, '.maencof', 'stale-nodes.json'),
    JSON.stringify({ entries, updatedAt: '2026-01-01T00:00:00Z' }),
    'utf-8',
  );
}

function writeVaultMarkdown(
  relPath: string,
  frontmatter: Record<string, string | number | string[]>,
  body: string = 'body',
): void {
  const fullPath = join(vaultDir, relPath);
  mkdirSync(dirname(fullPath), { recursive: true });
  const fmYaml = Object.entries(frontmatter)
    .map(([k, v]) => {
      if (Array.isArray(v)) return `${k}: [${v.join(', ')}]`;
      if (typeof v === 'number') return `${k}: ${v}`;
      return `${k}: "${v}"`;
    })
    .join('\n');
  writeFileSync(fullPath, `---\n${fmYaml}\n---\n\n${body}\n`, 'utf-8');
}

beforeEach(() => {
  vaultDir = join(
    tmpdir(),
    `lens-graphcache-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(join(vaultDir, '.maencof'), { recursive: true });
  cache = new GraphCache();
});

afterEach(() => {
  rmSync(vaultDir, { recursive: true, force: true, maxRetries: 3 });
});

describe('GraphCache stale-merge', () => {
  // --- Basic (happy path) ---

  it('returns the loaded graph unchanged when no stale entries exist', async () => {
    writeShardedGraph([makeNode('doc/a.md', 'A')]);
    const g = await cache.getGraph(vaultDir);
    expect(g).not.toBeNull();
    expect(g?.nodes.size).toBe(1);
  });

  it('applies a mutate entry by adding the fresh node parsed from disk', async () => {
    writeShardedGraph([]);
    writeVaultMarkdown('doc/new.md', {
      layer: 2,
      created: '2026-01-01',
      updated: '2026-01-01',
      tags: ['note'],
      title: 'New',
    });
    writeStaleEntries([{ path: 'doc/new.md', op: 'mutate' }]);

    const g = await cache.getGraph(vaultDir);
    expect(g).not.toBeNull();
    const paths = Array.from(g?.nodes.values() ?? []).map((n) => n.path);
    expect(paths).toContain('doc/new.md');
  });

  it('applies a delete entry by removing the node from the graph', async () => {
    writeShardedGraph([makeNode('doc/old.md', 'Old')]);
    writeStaleEntries([{ path: 'doc/old.md', op: 'delete' }]);

    const g = await cache.getGraph(vaultDir);
    expect(g).not.toBeNull();
    expect(g?.nodes.size).toBe(0);
  });

  // --- Edge cases ---

  it('caps processed entries at 15, keeping only the most-recent slice', async () => {
    // Pre-load 16 nodes; queue 16 delete ops where the OLDEST entry should be
    // dropped by the cap. After merge, exactly 1 node (the oldest target) survives.
    const nodes = Array.from({ length: 16 }, (_, i) =>
      makeNode(`doc/n${i}.md`, `N${i}`),
    );
    writeShardedGraph(nodes);

    const entries = Array.from({ length: 16 }, (_, i) => ({
      path: `doc/n${i}.md`,
      op: 'delete' as const,
    }));
    writeStaleEntries(entries);

    const g = await cache.getGraph(vaultDir);
    expect(g).not.toBeNull();
    expect(g?.nodes.size).toBe(1);
    const paths = Array.from(g?.nodes.values() ?? []).map((n) => n.path);
    expect(paths).toEqual(['doc/n0.md']);
  });

  it('is idempotent: repeat calls return the same merged reference', async () => {
    writeShardedGraph([makeNode('doc/k.md', 'K')]);
    writeStaleEntries([{ path: 'doc/k.md', op: 'delete' }]);

    const g1 = await cache.getGraph(vaultDir);
    const g2 = await cache.getGraph(vaultDir);
    expect(g1).toBe(g2);
    expect(g2?.nodes.size).toBe(0);
  });

  it('swallows merge failures and still returns the loaded graph', async () => {
    writeShardedGraph([makeNode('doc/a.md', 'A')]);
    // Malformed stale-nodes.json — loadStaleEntries falls back to empty entries,
    // but even an outright merge throw must not break read availability.
    writeFileSync(
      join(vaultDir, '.maencof', 'stale-nodes.json'),
      '{ this is not valid json',
      'utf-8',
    );

    const g = await cache.getGraph(vaultDir);
    expect(g).not.toBeNull();
    expect(g?.nodes.size).toBe(1);
  });

  it('returns null when no graph cache exists, regardless of stale state', async () => {
    writeStaleEntries([{ path: 'doc/x.md', op: 'mutate' }]);
    const g = await cache.getGraph(vaultDir);
    expect(g).toBeNull();
  });
});

describe('GraphCache mtime guard + in-flight dedup', () => {
  it('complex-1: READ_REINDEX_CAP from @ogham/maencof equals 15 (drift guard)', () => {
    expect(READ_REINDEX_CAP).toBe(15);
  });

  it('complex-2: same stale-nodes.json mtime → loadStaleEntries called only once across two getGraph calls', async () => {
    writeShardedGraph([makeNode('doc/a.md', 'A')]);
    writeStaleEntries([{ path: 'doc/a.md', op: 'delete' }]);

    const loadSpy = vi.spyOn(MetadataStore.prototype, 'loadStaleEntries');

    await cache.getGraph(vaultDir);
    const callsAfterFirst = loadSpy.mock.calls.length;
    await cache.getGraph(vaultDir);
    const callsAfterSecond = loadSpy.mock.calls.length;

    // 두 번째 호출은 mtime 동일 → loadStaleEntries skip
    expect(callsAfterSecond).toBe(callsAfterFirst);
    expect(callsAfterFirst).toBeGreaterThanOrEqual(1);

    loadSpy.mockRestore();
  });

  it('complex-3: changed stale-nodes.json mtime → second getGraph re-loads stale entries', async () => {
    writeShardedGraph([
      makeNode('doc/a.md', 'A'),
      makeNode('doc/b.md', 'B'),
    ]);
    writeStaleEntries([{ path: 'doc/a.md', op: 'delete' }]);

    const loadSpy = vi.spyOn(MetadataStore.prototype, 'loadStaleEntries');

    await cache.getGraph(vaultDir);
    const callsAfterFirst = loadSpy.mock.calls.length;

    // mtime 갱신 — 새 entry 로 stale 파일 재작성 + 명시적 utimes
    writeStaleEntries([{ path: 'doc/b.md', op: 'delete' }]);
    const future = new Date(Date.now() + 5_000);
    await utimes(join(vaultDir, '.maencof', 'stale-nodes.json'), future, future);

    await cache.getGraph(vaultDir);
    const callsAfterSecond = loadSpy.mock.calls.length;

    expect(callsAfterSecond).toBeGreaterThan(callsAfterFirst);
    loadSpy.mockRestore();
  });

  it('complex-4: 5 concurrent getGraph(vault) calls → loadStaleEntries runs once (in-flight dedup)', async () => {
    writeShardedGraph([makeNode('doc/a.md', 'A')]);
    writeStaleEntries([{ path: 'doc/a.md', op: 'delete' }]);

    const loadSpy = vi.spyOn(MetadataStore.prototype, 'loadStaleEntries');
    const fresh = new GraphCache();

    await Promise.all(
      Array.from({ length: 5 }, () => fresh.getGraph(vaultDir)),
    );

    // cold-load + 단일 dedup 적용된 stale merge → loadStaleEntries 가 정확히 1회만 실행
    expect(loadSpy.mock.calls.length).toBe(1);
    loadSpy.mockRestore();
  });

  it('complex-5: atomic-rename invariant — appendStaleEntries 직후 stat→load 가 항상 새 entry 를 가시화하고 graph-cache 가드가 머지에 반영한다', async () => {
    // 가드 안전성의 전제: metadata-store 의 atomic-rename 으로 stale-nodes.json 의
    // mtime advance 와 누적 entries visibility 가 동기적으로 합치한다.
    // → (a) mtime 비역행, (b) load 가 직전 append 를 항상 포함, (c) graph-cache 가
    //   가드 skip 없이 그 변화를 머지에 반영.
    const seedNodes = Array.from({ length: 5 }, (_, i) =>
      makeNode(`doc/n${i}.md`, `N${i}`),
    );
    writeShardedGraph(seedNodes);

    const fresh = new GraphCache();
    const initial = await fresh.getGraph(vaultDir);
    expect(initial?.nodes.size).toBe(5);

    const store = new MetadataStore(vaultDir);
    const staleFile = join(vaultDir, '.maencof', 'stale-nodes.json');

    let lastMtime = -Infinity;
    for (let i = 0; i < 5; i++) {
      const path = `doc/n${i}.md`;
      await store.appendStaleEntries([{ path, op: 'delete' }]);

      // (a) atomic-rename → mtime advance 비역행
      const s = await stat(staleFile);
      expect(s.mtimeMs).toBeGreaterThanOrEqual(lastMtime);
      lastMtime = s.mtimeMs;

      // (b) load 는 누적 entries 를 가시화 — atomic-rename 이 깨졌다면 partial JSON
      //     으로 loadStaleEntries 가 fallback 빈 entries 를 반환했을 것
      const stale = await store.loadStaleEntries();
      const paths = new Set(stale.entries.map((e) => e.path));
      expect(paths.has(path)).toBe(true);

      // mtime ms 해상도 충돌 회피 — 가드의 skip 분기 자체는 별도 케이스(complex-2)에서 검증
      const advanced = new Date(Date.now() + (i + 1) * 1000);
      await utimes(staleFile, advanced, advanced);

      // (c) graph-cache 가드 통합: 가드 통과 후 새 entry 가 머지에 반영
      const merged = await fresh.getGraph(vaultDir);
      const remaining = Array.from(merged?.nodes.values() ?? []).map((n) => n.path);
      expect(remaining).not.toContain(path);
    }

    const final = await fresh.getGraph(vaultDir);
    expect(final?.nodes.size).toBe(0);
  });
});
