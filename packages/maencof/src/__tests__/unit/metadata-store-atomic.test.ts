/**
 * @file metadata-store-atomic.test.ts
 * @description appendStaleNodes의 atomic write + 동시 호출 데이터 보존 검증.
 */
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { MetadataStore } from '../../core/indexer/metadata-store/metadata-store.js';

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

describe('MetadataStore.appendStaleNodes atomic write', () => {
  it('단일 호출은 stale-nodes.json에 정확히 기록된다', async () => {
    const store = new MetadataStore(vaultDir);
    await store.appendStaleNodes(['a.md', 'b.md']);
    const raw = readFileSync(join(vaultDir, '.maencof', 'stale-nodes.json'), 'utf-8');
    const parsed = JSON.parse(raw) as { paths: string[] };
    expect(parsed.paths).toEqual(['a.md', 'b.md']);
  });

  it('동시 두 호출에서 데이터 손실 없이 합집합 보존', async () => {
    const store = new MetadataStore(vaultDir);
    await Promise.all([
      store.appendStaleNodes(['a.md', 'b.md']),
      store.appendStaleNodes(['b.md', 'c.md']),
    ]);
    const stale = await store.loadStaleNodes();
    expect(new Set(stale.paths)).toEqual(new Set(['a.md', 'b.md', 'c.md']));
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
});
