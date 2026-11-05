/** @file metadataStore.generations.test.ts 세대 간 샤드 혼합과 구포맷 읽기 차단. */
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CACHE_FILES } from '../../../../constants/cacheFiles.js';
import type { KnowledgeGraph } from '../../../../types/graph.js';
import { atomicWriteJson } from '../operations/atomicWriteJson.js';
import { MetadataStore } from '../operations/metadataStore.js';

import { buildGenerationGraph } from './helpers/buildGenerationGraph.js';

vi.mock('../operations/atomicWriteJson.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../operations/atomicWriteJson.js')>();
  return { atomicWriteJson: vi.fn(actual.atomicWriteJson) };
});
/** 마커 공개 실패만 주입하고 샤드 쓰기는 실제로 수행한다. */
const originalAtomic = await vi.importActual<
  typeof import('../operations/atomicWriteJson.js')
>('../operations/atomicWriteJson.js');

describe('MetadataStore generations', () => {
  let vault: string;
  let cache: string;
  let store: MetadataStore;
  const graph: KnowledgeGraph = {
    nodes: new Map(),
    edges: [],
    builtAt: 'first',
    nodeCount: 0,
    edgeCount: 0,
  };
  beforeEach(async () => {
    vi.resetAllMocks();
    vault = await mkdtemp(join(tmpdir(), 'maencof-generations-'));
    cache = join(vault, '.maencof');
    store = new MetadataStore(vault);
  });
  afterEach(async () => {
    await rm(vault, { recursive: true, force: true });
  });

  it('keeps the lens marker address and reads only its named generation', async () => {
    await store.saveGraph(graph);
    const marker = JSON.parse(
      await readFile(join(cache, CACHE_FILES.GRAPH_META), 'utf-8'),
    );
    expect(marker).toMatchObject({
      schemaVersion: 3,
      generation: expect.any(String),
    });
    const nodes = JSON.parse(
      await readFile(
        join(cache, 'generations', marker.generation, CACHE_FILES.NODES),
        'utf-8',
      ),
    );
    expect(nodes).toEqual({ generation: marker.generation, data: [] });
    await expect(new MetadataStore(vault).loadGraph()).resolves.toMatchObject({
      builtAt: 'first',
    });
  });

  it.each([CACHE_FILES.NODES, CACHE_FILES.EDGES, CACHE_FILES.ARCHIVE_MEMBERS])(
    'rejects a mismatched generation in %s',
    async (file) => {
      await store.saveGraph(graph);
      const marker = JSON.parse(
        await readFile(join(cache, CACHE_FILES.GRAPH_META), 'utf-8'),
      );
      const dir = join(cache, 'generations', marker.generation ?? 'fixture');
      await mkdir(dir, { recursive: true });
      await writeFile(
        join(dir, file),
        JSON.stringify({ generation: 'other-save', data: [] }),
      );
      await expect(store.loadGraph()).resolves.toBeNull();
    },
  );

  it('deletes the previous generation after publishing a fresh one', async () => {
    await store.saveGraph(graph);
    const first = JSON.parse(
      await readFile(join(cache, CACHE_FILES.GRAPH_META), 'utf-8'),
    );
    await store.saveGraph({ ...graph, builtAt: 'second' });
    const second = JSON.parse(
      await readFile(join(cache, CACHE_FILES.GRAPH_META), 'utf-8'),
    );
    expect(second.generation).not.toBe(first.generation);
    expect(await readdir(join(cache, 'generations'))).toEqual([
      second.generation,
    ]);
    await expect(store.loadGraph()).resolves.toMatchObject({
      builtAt: 'second',
    });
  });

  it('never reads an unpublished generation left by a crash', async () => {
    await store.saveGraph(graph);
    const unpublished = buildGenerationGraph('unpublished');
    const dir = join(cache, 'generations', 'unpublished');
    await mkdir(dir, { recursive: true });
    for (const [file, data] of [
      [CACHE_FILES.NODES, [...unpublished.nodes.values()]],
      [CACHE_FILES.EDGES, unpublished.edges],
      [CACHE_FILES.ARCHIVE_MEMBERS, []],
    ] as const)
      await writeFile(
        join(dir, file),
        JSON.stringify({ generation: 'unpublished', data }),
      );
    await writeFile(
      join(cache, CACHE_FILES.INDEX),
      JSON.stringify({
        ...unpublished,
        nodes: [...unpublished.nodes.values()],
      }),
    );
    await expect(store.loadGraph()).resolves.toMatchObject({
      builtAt: 'first',
    });
    await rm(join(cache, CACHE_FILES.GRAPH_META));
    await expect(store.loadGraph()).resolves.toBeNull();
  });

  it('keeps the committed graph readable if publishing the next marker fails', async () => {
    const first = buildGenerationGraph('committed');
    const second = buildGenerationGraph('uncommitted');
    await store.saveGraph(first);
    const markerPath = join(cache, CACHE_FILES.GRAPH_META);
    const before = await readFile(markerPath, 'utf-8');
    vi.mocked(atomicWriteJson).mockImplementation(
      async (path, data, options) => {
        if (path === markerPath) throw new Error('marker unavailable');
        return originalAtomic.atomicWriteJson(path, data, options);
      },
    );
    await expect(store.saveGraph(second)).rejects.toThrow('marker unavailable');
    expect(await readFile(markerPath, 'utf-8')).toBe(before);
    const loaded = await store.loadGraph();
    expect(loaded?.nodes).toEqual(first.nodes);
    expect(loaded?.edges).toEqual(first.edges);
    expect(loaded?.builtAt).toBe(first.builtAt);
  });

  it.each(['legacy', 'split-v2'])(
    'treats %s as absent without migrating it',
    async (format) => {
      await mkdir(cache);
      await writeFile(
        join(cache, CACHE_FILES.INDEX),
        JSON.stringify({
          nodes: [],
          edges: [],
          builtAt: 'old',
          nodeCount: 0,
          edgeCount: 0,
        }),
      );
      if (format === 'split-v2') {
        await writeFile(
          join(cache, CACHE_FILES.GRAPH_META),
          JSON.stringify({ schemaVersion: 2, builtAt: 'old' }),
        );
        await writeFile(join(cache, CACHE_FILES.NODES), '[]');
        await writeFile(join(cache, CACHE_FILES.EDGES), '[]');
      }
      const before = await readdir(cache);
      await expect(store.loadGraph()).resolves.toBeNull();
      await expect(store.cacheExists()).resolves.toBe(false);
      expect(await readdir(cache)).toEqual(before);
    },
  );
});
