/**
 * @file freshness-guard.test.ts
 * @description ensureFreshGraphNonBlocking — stale 0 / 일부 / 임계치 초과 시 즉시 응답 검증.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { invalidateCache } from '../../../mcp/server/graph-cache/index.js';
import { _peekRebuildInProgress } from '../../../mcp/server/middlewares/background-rebuild.js';
import { ensureFreshGraphNonBlocking } from '../../../mcp/server/middlewares/freshness-guard.js';

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
  writeFileSync(
    join(vaultDir, '.maencof', 'index.json'),
    JSON.stringify({
      nodes: [node],
      edges: [],
      builtAt: '2026-01-01T00:00:00Z',
      nodeCount: 1,
      edgeCount: 0,
    }),
    'utf-8',
  );
}

function writeStale(paths: string[]): void {
  writeFileSync(
    join(vaultDir, '.maencof', 'stale-nodes.json'),
    JSON.stringify({ paths, updatedAt: '2026-01-01T00:00:00Z' }),
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
});
