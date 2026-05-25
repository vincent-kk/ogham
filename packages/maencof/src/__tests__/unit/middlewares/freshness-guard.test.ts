/**
 * @file freshness-guard.test.ts
 * @description ensureFreshGraphNonBlocking — stale 0 / 일부 / 임계치 초과 시 즉시 응답 검증.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { READ_REINDEX_CAP } from '../../../constants/thresholds.js';
import { invalidateCache } from '../../../mcp/server/graph-cache/index.js';
import { _peekRebuildInProgress } from '../../../mcp/server/middlewares/background-rebuild.js';
import { ensureFreshGraphNonBlocking } from '../../../mcp/server/middlewares/freshness-guard.js';
import {
  invalidateQueryCache,
  query,
} from '../../../search/query-engine/query-engine.js';
import type { NodeId } from '../../../types/common.js';

let vaultDir: string;

function writeMinimalGraph(): void {
  const node = {
    id: 'doc/a.md',
    path: 'doc/a.md',
    title: 'A',
    layer: 2,
    tags: ['t'],
    created: '2026-01-01',
    updated: '2026-01-01',
    mtime: 0,
    accessed_count: 0,
  };
  const cacheDir = join(vaultDir, '.maencof');
  writeFileSync(join(cacheDir, 'nodes.json'), JSON.stringify([node]), 'utf-8');
  writeFileSync(join(cacheDir, 'edges.json'), JSON.stringify([]), 'utf-8');
  writeFileSync(
    join(cacheDir, 'graph-meta.json'),
    JSON.stringify({
      builtAt: '2026-01-01T00:00:00Z',
      nodeCount: 1,
      edgeCount: 0,
      schemaVersion: 2,
    }),
    'utf-8',
  );
}

function writeStale(paths: string[]): void {
  // 레거시 { paths } 스키마로 직접 작성 — 로더의 자동 승격 검증 겸용
  writeFileSync(
    join(vaultDir, '.maencof', 'stale-nodes.json'),
    JSON.stringify({ paths, updatedAt: '2026-01-01T00:00:00Z' }),
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

beforeEach(() => {
  vaultDir = join(
    tmpdir(),
    `maencof-fg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(join(vaultDir, '.maencof'), { recursive: true });
  invalidateCache();
});

afterEach(async () => {
  // background rebuild가 진행 중이면 settle 후 정리
  const inflight = _peekRebuildInProgress();
  if (inflight) {
    await inflight.catch(() => undefined);
  }
  rmSync(vaultDir, { recursive: true, force: true, maxRetries: 3 });
  invalidateCache();
});

describe('ensureFreshGraphNonBlocking', () => {
  it('graph 부재 시 null 반환', async () => {
    const result = await ensureFreshGraphNonBlocking(vaultDir);
    expect(result).toBeNull();
  });

  it('stale 0이면 graph reference를 그대로 반환', async () => {
    writeMinimalGraph();
    const result = await ensureFreshGraphNonBlocking(vaultDir);
    expect(result).not.toBeNull();
    expect(result?.nodes.size).toBe(1);
    expect(_peekRebuildInProgress()).toBeNull();
  });

  it('stale 1..14는 background rebuild를 트리거하지 않는다', async () => {
    writeMinimalGraph();
    writeStale(['unknown.md']);
    const result = await ensureFreshGraphNonBlocking(vaultDir);
    expect(result).not.toBeNull();
    expect(_peekRebuildInProgress()).toBeNull();
  });

  it('stale ≥ 15 (STALE_REBUILD_THRESHOLD)는 background rebuild를 트리거한다', async () => {
    writeMinimalGraph();
    writeStale(Array.from({ length: 15 }, (_, i) => `missing-${i}.md`));
    const result = await ensureFreshGraphNonBlocking(vaultDir);
    expect(result).not.toBeNull();
    expect(_peekRebuildInProgress()).not.toBeNull();
  });

  it('entries 가 READ_REINDEX_CAP 을 초과하면 가장 최근 N 개만 처리한다', async () => {
    writeMinimalGraph();
    const total = READ_REINDEX_CAP + 15;
    writeStaleEntries(
      Array.from({ length: total }, (_, i) => ({
        path: `nonexistent-${i}.md`,
        op: 'mutate' as const,
      })),
    );

    const t0 = Date.now();
    const graph = await ensureFreshGraphNonBlocking(vaultDir);
    const elapsed = Date.now() - t0;
    expect(graph).not.toBeNull();
    // bg rebuild trigger
    expect(_peekRebuildInProgress()).not.toBeNull();
    // partial reindex 가 N 개 ENOENT 만 시도하므로 즉시 반환되어야 함 (느슨한 상한 1s)
    expect(elapsed).toBeLessThan(1000);
  });

  it('레거시 { paths } 와 신 { entries } 스키마 모두 처리한다', async () => {
    writeMinimalGraph();
    writeStale(['legacy.md']);
    const r1 = await ensureFreshGraphNonBlocking(vaultDir);
    expect(r1).not.toBeNull();

    writeStaleEntries([{ path: 'new.md', op: 'mutate' }]);
    invalidateCache();
    const r2 = await ensureFreshGraphNonBlocking(vaultDir);
    expect(r2).not.toBeNull();
  });

  it('complex-7: graph 가 partial-reindex 로 mutate 된 직후 ensureFreshGraphNonBlocking 가 stale cached query 결과를 반환하지 않는다', async () => {
    // builtAt 미변경 in-place mutation 이라도 mergeStaleNodesIntoGraph 가 자체적으로
    // invalidateQueryCache 를 호출 → 같은 builtAt 키에 묶인 SA 캐시가 재사용되지 않는다.
    writeMinimalGraph();
    invalidateQueryCache();

    const g1 = await ensureFreshGraphNonBlocking(vaultDir);
    expect(g1).not.toBeNull();
    if (!g1) throw new Error('graph null');

    // 사전 query 1회 → cache 저장 (1 node 결과)
    const before = query(g1, ['t']);
    void before;
    expect(g1.nodes.size).toBe(1);

    // delete stale entry 적용
    writeStaleEntries([{ path: 'doc/a.md', op: 'delete' }]);

    // ensureFreshGraphNonBlocking → 내부 mergeStaleNodesIntoGraph → invalidateQueryCache 자동
    const g2 = await ensureFreshGraphNonBlocking(vaultDir);
    expect(g2).not.toBeNull();
    if (!g2) throw new Error('graph null after merge');
    expect(g2.nodes.has('doc/a.md' as NodeId)).toBe(false);
    expect(g2.nodes.size).toBe(0);

    // 같은 seeds 로 query → cache 가 invalidate 되었으므로 post-merge graph 로 재실행
    const after = query(g2, ['t']);
    expect(after.results.length).toBe(0);
  });
});
