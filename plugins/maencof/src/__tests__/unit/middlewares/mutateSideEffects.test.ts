/**
 * @file mutateSideEffects.test.ts
 * @description runMutateSideEffects — stale append + op 분류 + usage-stats + threshold 도달 시 bg trigger.
 */
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { MetadataStore } from '../../../core/indexer/metadataStore/metadataStore.js';
import { _peekRebuildInProgress } from '../../../mcp/server/middlewares/backgroundRebuild.js';
import { runMutateSideEffects } from '../../../mcp/server/middlewares/mutateSideEffects.js';

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
  it('create 는 op=mutate 로 stale entry 를 append 하고 usage-stats 를 증가시킨다', async () => {
    await runMutateSideEffects(vaultDir, 'create', 'doc/new.md');

    const store = new MetadataStore(vaultDir);
    const stale = await store.loadStaleEntries();
    expect(stale.entries).toContainEqual({ path: 'doc/new.md', op: 'mutate' });

    const statsPath = join(vaultDir, '.maencof-meta', 'usage-stats.json');
    expect(existsSync(statsPath)).toBe(true);
    const stats = JSON.parse(readFileSync(statsPath, 'utf-8')) as Record<
      string,
      number
    >;
    expect(stats['create']).toBe(1);
  });

  it('update 는 단일 path 를 op=mutate 로 기록한다', async () => {
    await runMutateSideEffects(vaultDir, 'update', 'foo.md');
    const store = new MetadataStore(vaultDir);
    const stale = await store.loadStaleEntries();
    expect(stale.entries).toEqual([{ path: 'foo.md', op: 'mutate' }]);
  });

  it('delete 는 단일 path 를 op=delete 로 기록한다', async () => {
    await runMutateSideEffects(vaultDir, 'delete', 'foo.md');
    const store = new MetadataStore(vaultDir);
    const stale = await store.loadStaleEntries();
    expect(stale.entries).toEqual([{ path: 'foo.md', op: 'delete' }]);
  });

  it('move 는 src=delete + dst=mutate 두 entry 를 기록한다', async () => {
    await runMutateSideEffects(vaultDir, 'move', 'old.md', 'new.md');
    const store = new MetadataStore(vaultDir);
    const stale = await store.loadStaleEntries();
    expect(stale.entries).toEqual([
      { path: 'old.md', op: 'delete' },
      { path: 'new.md', op: 'mutate' },
    ]);
  });

  it('임계치(5) 미만에서는 background rebuild 를 트리거하지 않는다', async () => {
    const store = new MetadataStore(vaultDir);
    await store.appendStaleEntries(
      Array.from({ length: 3 }, (_, i) => ({
        path: `pre-${i}.md`,
        op: 'mutate' as const,
      })),
    );
    await runMutateSideEffects(vaultDir, 'update', 'fresh.md');
    expect(_peekRebuildInProgress()).toBeNull();
  });

  it('임계치(5) 도달 시 background rebuild 를 트리거한다', async () => {
    const store = new MetadataStore(vaultDir);
    await store.appendStaleEntries(
      Array.from({ length: 4 }, (_, i) => ({
        path: `pre-${i}.md`,
        op: 'mutate' as const,
      })),
    );
    await runMutateSideEffects(vaultDir, 'update', 'trigger.md');
    expect(_peekRebuildInProgress()).not.toBeNull();
  });
});
