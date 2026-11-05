/** @file metadataStore.loadErrors.test.ts 읽기 실패 진단과 폴백 격리 회귀 검사. */
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CACHE_FILES } from '../../../../constants/cacheFiles.js';
import { MetadataStore } from '../operations/metadataStore.js';

describe('MetadataStore load error reporting', () => {
  let vaultPath: string;
  let cacheDir: string;
  let store: MetadataStore;
  let shardDir: string;
  const onLoadError = vi.fn<(error: unknown) => void>();

  beforeEach(async () => {
    onLoadError.mockReset();
    vaultPath = await mkdtemp(join(tmpdir(), 'maencof-load-errors-'));
    cacheDir = join(vaultPath, '.maencof');
    store = new MetadataStore(vaultPath, onLoadError);
    await store.saveGraph({
      nodes: new Map(),
      edges: [],
      builtAt: 'test',
      nodeCount: 0,
      edgeCount: 0,
    });
    const meta = JSON.parse(
      await readFile(join(cacheDir, CACHE_FILES.GRAPH_META), 'utf-8'),
    );
    shardDir = join(cacheDir, 'generations', meta.generation);
  });

  afterEach(async () => {
    await rm(vaultPath, { recursive: true, force: true });
  });

  it.each([CACHE_FILES.GRAPH_META, CACHE_FILES.NODES, CACHE_FILES.EDGES])(
    'returns null and reports one error for corrupt %s',
    async (file) => {
      await writeFile(
        join(
          file === CACHE_FILES.NODES || file === CACHE_FILES.EDGES
            ? shardDir
            : cacheDir,
          file,
        ),
        '{broken json',
      );

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

  it('ignores a legacy index when the generation marker is missing', async () => {
    await rm(join(cacheDir, CACHE_FILES.GRAPH_META));
    await writeFile(join(cacheDir, CACHE_FILES.INDEX), '{broken json');

    await expect(store.loadGraph()).resolves.toBeNull();
    expect(onLoadError).not.toHaveBeenCalled();
  });

  it('reports a corrupt archive shard and keeps the main graph readable', async () => {
    await writeFile(join(shardDir, CACHE_FILES.ARCHIVE_MEMBERS), '{broken');

    const graph = await store.loadGraph();
    expect(graph).toMatchObject({ builtAt: 'test' });
    expect(graph?.archiveClusterMembers).toBeUndefined();
    expect(onLoadError).toHaveBeenCalledExactlyOnceWith(
      expect.any(SyntaxError),
    );
  });

  it.each(['null', '{}', '{"generation":"unreadable","data":null}'])(
    'ignores a damaged optional archive shape: %s',
    async (raw) => {
      if (raw.includes('unreadable')) {
        const meta = JSON.parse(
          await readFile(join(cacheDir, CACHE_FILES.GRAPH_META), 'utf-8'),
        );
        raw = JSON.stringify({ generation: meta.generation, data: null });
      }
      await writeFile(join(shardDir, CACHE_FILES.ARCHIVE_MEMBERS), raw);
      const graph = await store.loadGraph();
      expect(graph).toMatchObject({ builtAt: 'test' });
      expect(graph?.archiveClusterMembers).toBeUndefined();
      expect(onLoadError).toHaveBeenCalledOnce();
    },
  );

  it.each([
    [CACHE_FILES.WEIGHTS, 'loadWeights'],
    [CACHE_FILES.SNAPSHOT, 'loadSnapshot'],
    [CACHE_FILES.STALE_NODES, 'loadStaleEntries'],
  ] as const)(
    'reports corrupt %s and retains its empty result',
    async (file, method) => {
      await writeFile(join(cacheDir, file), '{broken json');

      const result = await store[method]();
      if (method === 'loadStaleEntries')
        expect(result).toMatchObject({ entries: [] });
      else expect(result).toBeNull();
      expect(onLoadError).toHaveBeenCalledExactlyOnceWith(
        expect.any(SyntaxError),
      );
    },
  );

  it('reports an unexpected marker read error without a legacy fallback', async () => {
    await rm(join(cacheDir, CACHE_FILES.GRAPH_META));
    await mkdir(join(cacheDir, CACHE_FILES.GRAPH_META));

    await expect(store.loadGraph()).resolves.toBeNull();
    expect(onLoadError).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ code: 'EISDIR' }),
    );
  });

  it('isolates a throwing error callback from load results', async () => {
    await writeFile(join(shardDir, CACHE_FILES.NODES), '{broken json');
    onLoadError.mockImplementation(() => {
      throw new Error('diagnostic sink unavailable');
    });

    await expect(store.loadGraph()).resolves.toBeNull();
    expect(onLoadError).toHaveBeenCalledOnce();
  });
});
