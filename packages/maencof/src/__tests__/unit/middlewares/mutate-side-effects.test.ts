/**
 * @file mutate-side-effects.test.ts
 * @description runMutateSideEffects — stale append, usage-stats, threshold 도달 시 bg trigger.
 */
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { MetadataStore } from '../../../core/indexer/metadata-store/metadata-store.js';
import { _peekRebuildInProgress } from '../../../mcp/server/middlewares/background-rebuild.js';
import { runMutateSideEffects } from '../../../mcp/server/middlewares/mutate-side-effects.js';

let vaultDir: string;

beforeEach(() => {
  vaultDir = join(
    tmpdir(),
    `maencof-mse-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(join(vaultDir, '.maencof'), { recursive: true });
  mkdirSync(join(vaultDir, '.maencof-meta'), { recursive: true });
});

afterEach(async () => {
  const inflight = _peekRebuildInProgress();
  if (inflight) await inflight.catch(() => undefined);
  rmSync(vaultDir, { recursive: true, force: true, maxRetries: 3 });
});

describe('runMutateSideEffects', () => {
  it('affectedPath를 stale-nodes에 append하고 usage-stats를 증가시킨다', async () => {
    await runMutateSideEffects(vaultDir, 'create', 'doc/new.md');

    const store = new MetadataStore(vaultDir);
    const stale = await store.loadStaleNodes();
    expect(stale.paths).toContain('doc/new.md');

    const statsPath = join(vaultDir, '.maencof-meta', 'usage-stats.json');
    expect(existsSync(statsPath)).toBe(true);
    const stats = JSON.parse(readFileSync(statsPath, 'utf-8')) as Record<string, number>;
    expect(stats['create']).toBe(1);
  });

  it('alsoAffectedPath까지 두 경로가 stale에 추가된다 (move 케이스)', async () => {
    await runMutateSideEffects(vaultDir, 'move', 'src.md', 'tgt.md');
    const store = new MetadataStore(vaultDir);
    const stale = await store.loadStaleNodes();
    expect(new Set(stale.paths)).toEqual(new Set(['src.md', 'tgt.md']));
  });

  it('임계치(15) 미만에서는 background rebuild를 트리거하지 않는다', async () => {
    // 14개 stale 미리 등록 후 1번 더 호출 → 총 15에 도달하지 않게
    const store = new MetadataStore(vaultDir);
    await store.appendStaleNodes(
      Array.from({ length: 13 }, (_, i) => `pre-${i}.md`),
    );
    await runMutateSideEffects(vaultDir, 'update', 'fresh.md');
    expect(_peekRebuildInProgress()).toBeNull();
  });

  it('임계치(15) 도달 시 background rebuild를 트리거한다', async () => {
    const store = new MetadataStore(vaultDir);
    await store.appendStaleNodes(
      Array.from({ length: 14 }, (_, i) => `pre-${i}.md`),
    );
    await runMutateSideEffects(vaultDir, 'update', 'trigger.md');
    expect(_peekRebuildInProgress()).not.toBeNull();
  });
});
