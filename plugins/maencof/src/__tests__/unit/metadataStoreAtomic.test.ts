/**
 * @file metadataStoreAtomic.test.ts
 * @description appendStaleEntries 의 atomic write + 동시 호출 데이터 보존 + 레거시 스키마 자동 승격 검증.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { MetadataStore } from '../../core/indexer/metadataStore/index.js';

let vaultDir: string;

beforeEach(() => {
  vaultDir = join(
    tmpdir(),
    `maencof-atomic-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(join(vaultDir, '.maencof'), { recursive: true });
});

afterEach(() => {
  rmSync(vaultDir, { recursive: true, force: true, maxRetries: 3 });
});

describe('MetadataStore.appendStaleEntries atomic write', () => {
  it('단일 호출은 stale-nodes.json 에 정확히 기록된다', async () => {
    const store = new MetadataStore(vaultDir);
    await store.appendStaleEntries([
      { path: 'a.md', op: 'mutate' },
      { path: 'b.md', op: 'mutate' },
    ]);
    const raw = readFileSync(
      join(vaultDir, '.maencof', 'stale-nodes.json'),
      'utf-8',
    );
    const parsed = JSON.parse(raw) as {
      entries: { path: string; op: string }[];
    };
    expect(parsed.entries).toEqual([
      { path: 'a.md', op: 'mutate' },
      { path: 'b.md', op: 'mutate' },
    ]);
  });

  it('동시 두 호출에서 데이터 손실 없이 (path, op) 합집합 보존', async () => {
    const store = new MetadataStore(vaultDir);
    await Promise.all([
      store.appendStaleEntries([
        { path: 'a.md', op: 'mutate' },
        { path: 'b.md', op: 'mutate' },
      ]),
      store.appendStaleEntries([
        { path: 'b.md', op: 'mutate' },
        { path: 'c.md', op: 'delete' },
      ]),
    ]);
    const stale = await store.loadStaleEntries();
    const keys = new Set(stale.entries.map((e) => `${e.op}::${e.path}`));
    expect(keys).toEqual(
      new Set(['mutate::a.md', 'mutate::b.md', 'delete::c.md']),
    );
  });

  it('saveSnapshot 호출 후 정상 파일 형식 유지', async () => {
    const store = new MetadataStore(vaultDir);
    await store.saveSnapshot({
      entries: [{ path: 'a.md', mtime: 1000, size: 100 }],
      capturedAt: '2026-01-01T00:00:00Z',
    });
    const loaded = await store.loadSnapshot();
    expect(loaded?.entries).toHaveLength(1);
    expect(loaded?.entries[0].path).toBe('a.md');
  });

  it('레거시 { paths } 스키마는 자동으로 { entries: op:mutate } 로 승격', async () => {
    writeFileSync(
      join(vaultDir, '.maencof', 'stale-nodes.json'),
      JSON.stringify({
        paths: ['old1.md', 'old2.md'],
        updatedAt: '2026-01-01T00:00:00Z',
      }),
      'utf-8',
    );
    const store = new MetadataStore(vaultDir);
    const stale = await store.loadStaleEntries();
    expect(stale.entries).toEqual([
      { path: 'old1.md', op: 'mutate' },
      { path: 'old2.md', op: 'mutate' },
    ]);

    // 신규 append 후에는 신 형식으로 디스크에 반영된다
    await store.appendStaleEntries([{ path: 'new.md', op: 'delete' }]);
    const raw = readFileSync(
      join(vaultDir, '.maencof', 'stale-nodes.json'),
      'utf-8',
    );
    const parsed = JSON.parse(raw) as {
      entries: { path: string; op: string }[];
    };
    expect(parsed.entries).toEqual([
      { path: 'old1.md', op: 'mutate' },
      { path: 'old2.md', op: 'mutate' },
      { path: 'new.md', op: 'delete' },
    ]);
  });
});
