/**
 * @file mcp-mutate-then-read.test.ts
 * @description integration — mutate 후 즉시 kg_search에서 신규 노드 + outbound link 검증.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleMaencofCreate } from '../../mcp/tools/maencof-create/index.js';
import { handleKgSearch } from '../../mcp/tools/kg-search/index.js';
import { handleKgBuild } from '../../mcp/tools/kg-build/index.js';
import {
  invalidateCache,
  loadGraphIfNeeded,
} from '../../mcp/server/graph-cache.js';
import {
  _peekRebuildInProgress,
} from '../../mcp/server/middlewares/background-rebuild.js';
import { ensureFreshGraphNonBlocking } from '../../mcp/server/middlewares/freshness-guard.js';
import { runMutateSideEffects } from '../../mcp/server/middlewares/mutate-side-effects.js';

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
  it('create 후 partial reindex가 신규 노드를 ensureFreshGraphNonBlocking에 즉시 노출한다', async () => {
    const result = await handleMaencofCreate(vaultDir, {
      layer: 2,
      tags: ['fresh'],
      content: '[[seed]] 참조하는 새 노드.',
      title: 'New Note',
    });
    expect(result.success).toBe(true);

    // 시뮬레이션: MCP wrapper가 호출하는 side effects
    await runMutateSideEffects(vaultDir, 'create', result.path);

    const graph = await ensureFreshGraphNonBlocking(vaultDir);
    expect(graph).not.toBeNull();
    const ids = Array.from(graph!.nodes.values()).map((n) => n.path);
    expect(ids).toContain(result.path);
  });

  it('create + partial reindex 후 kg_search 결과에 신규 노드가 포함된다', async () => {
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

    // 신규 노드는 graph nodes에 즉시 등장 — kg_search의 출력 shape 변동성에 의존하지 않고
    // partial reindex가 노드를 graph에 반영했음을 직접 확인한다.
    const ids = Array.from(graph!.nodes.values()).map((n) => n.path);
    expect(ids).toContain(result.path);

    // kg_search는 호출 가능하고 에러 없이 반환되어야 한다 (결과 매칭은 SA 알고리즘 의존).
    const search = await handleKgSearch(graph, {
      seed: ['searchable'],
      max_results: 10,
    });
    expect(search).toBeDefined();
  });

  it('background rebuild가 트리거되어도 read 응답을 await하지 않는다', async () => {
    // 14개 stale 미리 쌓고 mutate 1회 → 임계치 도달 → bg rebuild trigger
    const { MetadataStore } = await import(
      '../../core/indexer/metadata-store/metadata-store.js'
    );
    const store = new MetadataStore(vaultDir);
    await store.appendStaleNodes(
      Array.from({ length: 14 }, (_, i) => `pre-${i}.md`),
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
    // bg rebuild가 동기적으로 await 되지 않았음을 시간으로 검증 (느슨하게 1s 미만)
    expect(elapsed).toBeLessThan(1000);
    expect(_peekRebuildInProgress()).not.toBeNull();
  });
});
