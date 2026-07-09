/**
 * @file mcpMutateThenRead.test.ts
 * @description integration — mutate(create/delete) 후 즉시 ensureFreshGraphNonBlocking + kg_search 검증.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { invalidateCache } from '../../mcp/server/graphCache/index.js';
import { _peekRebuildInProgress } from '../../mcp/server/middlewares/backgroundRebuild.js';
import { ensureFreshGraphNonBlocking } from '../../mcp/server/middlewares/freshnessGuard.js';
import { runMutateSideEffects } from '../../mcp/server/middlewares/mutateSideEffects.js';
import { handleKgBuild } from '../../mcp/tools/kgBuild/index.js';
import { handleKgSearch } from '../../mcp/tools/kgSearch/index.js';
import { handleMaencofCreate } from '../../mcp/tools/maencofCreate/index.js';
import { handleMaencofDelete } from '../../mcp/tools/maencofDelete/index.js';
import type { NodeId } from '../../types/common.js';

let vaultDir: string;

beforeEach(async () => {
  vaultDir = join(
    tmpdir(),
    `maencof-int-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(join(vaultDir, '.maencof'), { recursive: true });
  mkdirSync(join(vaultDir, '.maencof-meta'), { recursive: true });

  // seed: 02_Derived/seed.md + initial kg_build
  mkdirSync(join(vaultDir, '02_Derived'), { recursive: true });
  writeFileSync(
    join(vaultDir, '02_Derived', 'seed.md'),
    `---\nlayer: 2\ntags: [seed]\ncreated: 2026-01-01\nupdated: 2026-01-01\n---\n# Seed\nseed body\n`,
    'utf-8',
  );
  await handleKgBuild(vaultDir, { force: true });
  invalidateCache();
});

afterEach(async () => {
  const inflight = _peekRebuildInProgress();
  if (inflight) await inflight.catch(() => undefined);
  rmSync(vaultDir, { recursive: true, force: true, maxRetries: 3 });
  invalidateCache();
});

describe('mutate → immediate read pipeline', () => {
  it('create 후 partial reindex 가 신규 노드를 ensureFreshGraphNonBlocking 에 즉시 노출한다', async () => {
    const result = await handleMaencofCreate(vaultDir, {
      layer: 2,
      tags: ['fresh'],
      content: '[[seed]] 참조하는 새 노드.',
      title: 'New Note',
    });
    expect(result.success).toBe(true);

    await runMutateSideEffects(vaultDir, 'create', result.path);

    const graph = await ensureFreshGraphNonBlocking(vaultDir);
    expect(graph).not.toBeNull();
    const ids = Array.from(graph!.nodes.values()).map((n) => n.path);
    expect(ids).toContain(result.path);
  });

  it('create 후 kg_search 결과에 신규 노드가 포함된다 (tag seed)', async () => {
    const result = await handleMaencofCreate(vaultDir, {
      layer: 2,
      tags: ['searchable'],
      content: 'distinctive content for searching.',
      title: 'Search Target',
    });
    expect(result.success).toBe(true);

    await runMutateSideEffects(vaultDir, 'create', result.path);
    const graph = await ensureFreshGraphNonBlocking(vaultDir);
    expect(graph).not.toBeNull();

    const ids = Array.from(graph!.nodes.values()).map((n) => n.path);
    expect(ids).toContain(result.path);

    const search = await handleKgSearch(graph, {
      seed: ['searchable'],
      max_results: 10,
    });
    expect('error' in search).toBe(false);
    if ('error' in search) return;
    const hitIds = search.results.map((r) => String(r.nodeId));
    expect(hitIds).toContain(result.path);
  });

  it('delete 후 노드가 graph / edges / kg_search 결과에서 모두 제거된다', async () => {
    // 신규 노드 1개 생성 — kg_build 후 graph 에 등장하도록 force rebuild
    const target = await handleMaencofCreate(vaultDir, {
      layer: 2,
      tags: ['doomed'],
      content: '[[seed]] 참조하는 곧 삭제될 노드.',
      title: 'Doomed',
    });
    expect(target.success).toBe(true);
    // bg rebuild 대신 명시적 force 빌드로 graph 에 인덱싱
    await handleKgBuild(vaultDir, { force: true });
    invalidateCache();

    // 삭제 (force=true 로 backlink 무시)
    const del = await handleMaencofDelete(vaultDir, {
      path: target.path,
      force: true,
    });
    expect(del.success).toBe(true);
    await runMutateSideEffects(vaultDir, 'delete', target.path);

    const graph = await ensureFreshGraphNonBlocking(vaultDir);
    expect(graph).not.toBeNull();
    const targetId = target.path as NodeId;

    expect(graph!.nodes.has(targetId)).toBe(false);
    expect(
      graph!.edges.find((e) => e.from === targetId || e.to === targetId),
    ).toBeUndefined();

    const search = await handleKgSearch(graph, {
      seed: ['doomed'],
      max_results: 10,
    });
    expect('error' in search).toBe(false);
    if ('error' in search) return;
    const hitIds = search.results.map((r) => String(r.nodeId));
    expect(hitIds).not.toContain(target.path);
  });

  it('background rebuild 가 트리거되어도 read 응답을 await 하지 않는다', async () => {
    const { MetadataStore } =
      await import('../../core/indexer/metadataStore/index.js');
    const store = new MetadataStore(vaultDir);
    await store.appendStaleEntries(
      Array.from({ length: 14 }, (_, i) => ({
        path: `pre-${i}.md`,
        op: 'mutate' as const,
      })),
    );

    const created = await handleMaencofCreate(vaultDir, {
      layer: 2,
      tags: ['t'],
      content: 'body',
      title: 'Trigger',
    });
    expect(created.success).toBe(true);

    await runMutateSideEffects(vaultDir, 'create', created.path);

    const t0 = Date.now();
    const graph = await ensureFreshGraphNonBlocking(vaultDir);
    const elapsed = Date.now() - t0;
    expect(graph).not.toBeNull();
    expect(elapsed).toBeLessThan(1000);
    expect(_peekRebuildInProgress()).not.toBeNull();
  });
});
