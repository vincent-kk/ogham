/** @file metadataStore.loadErrors.test.ts 읽기 실패 진단과 폴백 격리 회귀 검사. */
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CACHE_FILES } from '../../../../constants/cacheFiles.js';
import { MetadataStore } from '../operations/metadataStore.js';

describe('MetadataStore load error reporting', () => {
  let vaultPath: string;
  let cacheDir: string;
  let store: MetadataStore;
  const onLoadError = vi.fn<(error: unknown) => void>();

  beforeEach(async () => {
    onLoadError.mockReset();
    vaultPath = await mkdtemp(join(tmpdir(), 'maencof-load-errors-'));
    cacheDir = join(vaultPath, '.maencof');
    await mkdir(cacheDir);
    await writeFile(
      join(cacheDir, CACHE_FILES.GRAPH_META),
      JSON.stringify({ schemaVersion: 2, builtAt: '2026-06-21T00:00:00Z' }),
    );
    await writeFile(join(cacheDir, CACHE_FILES.NODES), '[]');
    await writeFile(join(cacheDir, CACHE_FILES.EDGES), '[]');
    store = new MetadataStore(vaultPath, onLoadError);
  });

  afterEach(async () => {
    await rm(vaultPath, { recursive: true, force: true });
  });

  it.each([CACHE_FILES.GRAPH_META, CACHE_FILES.NODES, CACHE_FILES.EDGES])(
    'returns null and reports one error for corrupt %s',
    async (file) => {
      await writeFile(join(cacheDir, file), '{broken json');

      await expect(store.loadGraph()).resolves.toBeNull();
      expect(onLoadError).toHaveBeenCalledExactlyOnceWith(
        expect.any(SyntaxError),
      );
    },
  );

  it('keeps a missing cache silent across all public loaders', async () => {
    await rm(cacheDir, { recursive: true });

    await expect(store.loadGraph()).resolves.toBeNull();
    await expect(store.loadWeights()).resolves.toBeNull();
    await expect(store.loadSnapshot()).resolves.toBeNull();
    await expect(store.loadStaleEntries()).resolves.toMatchObject({
      entries: [],
    });
    expect(onLoadError).not.toHaveBeenCalled();
  });

  it('reports a corrupt legacy index without reporting its missing marker', async () => {
    await rm(join(cacheDir, CACHE_FILES.GRAPH_META));
    await writeFile(join(cacheDir, CACHE_FILES.INDEX), '{broken json');

    await expect(store.loadGraph()).resolves.toBeNull();
    expect(onLoadError).toHaveBeenCalledExactlyOnceWith(
      expect.any(SyntaxError),
    );
  });

  it('reports a corrupt optional archive shard while retaining the graph', async () => {
    await writeFile(join(cacheDir, CACHE_FILES.ARCHIVE_MEMBERS), '{broken');

    await expect(store.loadGraph()).resolves.toMatchObject({ nodeCount: 0 });
    expect(onLoadError).toHaveBeenCalledExactlyOnceWith(
      expect.any(SyntaxError),
    );
  });

  it.each([
    [CACHE_FILES.WEIGHTS, 'loadWeights'],
    [CACHE_FILES.SNAPSHOT, 'loadSnapshot'],
    [CACHE_FILES.STALE_NODES, 'loadStaleEntries'],
  ] as const)('reports corrupt %s and retains its empty result', async (file, method) => {
    await writeFile(join(cacheDir, file), '{broken json');

    const result = await store[method]();
    if (method === 'loadStaleEntries')
      expect(result).toMatchObject({ entries: [] });
    else expect(result).toBeNull();
    expect(onLoadError).toHaveBeenCalledExactlyOnceWith(
      expect.any(SyntaxError),
    );
  });

  it('reports an unexpected marker read error before the legacy fallback', async () => {
    await rm(join(cacheDir, CACHE_FILES.GRAPH_META));
    await mkdir(join(cacheDir, CACHE_FILES.GRAPH_META));

    await expect(store.loadGraph()).resolves.toBeNull();
    expect(onLoadError).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ code: 'EISDIR' }),
    );
  });

  it('isolates a throwing error callback from load results', async () => {
    await writeFile(join(cacheDir, CACHE_FILES.NODES), '{broken json');
    onLoadError.mockImplementation(() => {
      throw new Error('diagnostic sink unavailable');
    });

    await expect(store.loadGraph()).resolves.toBeNull();
    expect(onLoadError).toHaveBeenCalledOnce();
  });
});
