/**
 * @file metadataStoreRehydrate.test.ts
 * @description P0 — loadGraph 가 런타임 맵을 재수화하여 빌드직후/리로드 SA 동작이 일치함을 검증.
 */
import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { hydrateRuntimeMaps } from '../../core/graphBuilder/graphBuilder.js';
import { MetadataStore } from '../../core/indexer/metadataStore/metadataStore.js';
import { runSpreadingActivation } from '../../core/spreadingActivation/spreadingActivation.js';
import type { NodeId } from '../../types/common.js';
import type {
  KnowledgeEdge,
  KnowledgeGraph,
  KnowledgeNode,
} from '../../types/graph.js';

let vaultDir: string;

function node(id: string, title = id, tags: string[] = []): KnowledgeNode {
  return {
    id: id as NodeId,
    path: id,
    title,
    layer: 2,
    tags,
    created: '2026-01-01',
    updated: '2026-01-01',
    mtime: 0,
    accessed_count: 0,
  } as KnowledgeNode;
}

beforeEach(() => {
  vaultDir = join(
    tmpdir(),
    `maencof-rehydrate-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(join(vaultDir, '.maencof'), { recursive: true });
});

afterEach(() => {
  rmSync(vaultDir, { recursive: true, force: true, maxRetries: 3 });
});

describe('MetadataStore.loadGraph rehydration', () => {
  it('repopulates the four runtime maps after a save→load round-trip', async () => {
    const graph: KnowledgeGraph = {
      nodes: new Map([
        ['a.md' as NodeId, node('a.md', 'Alpha', ['t'])],
        ['b.md' as NodeId, node('b.md', 'Beta', ['t'])],
      ]),
      edges: [
        {
          from: 'a.md' as NodeId,
          to: 'b.md' as NodeId,
          type: 'LINK',
          weight: 1,
        },
      ],
      builtAt: 't',
      nodeCount: 2,
      edgeCount: 1,
    };
    hydrateRuntimeMaps(graph);

    const store = new MetadataStore(vaultDir);
    await store.saveGraph(graph);
    const loaded = await store.loadGraph();

    expect(loaded).not.toBeNull();
    expect(loaded!.invertedIndex?.get('alpha')?.has('a.md' as NodeId)).toBe(
      true,
    );
    expect(loaded!.adjacencyList?.get('a.md' as NodeId)).toEqual(['b.md']);
    expect(
      loaded!.edgeWeightMap?.get('a.md' as NodeId)?.get('b.md' as NodeId),
    ).toBe(1);
    expect(
      loaded!.edgeTypeMap?.get('a.md' as NodeId)?.get('b.md' as NodeId),
    ).toBe('LINK');
  });

  it('produces identical SA traversal for the built graph and the reloaded graph', async () => {
    const nodes: KnowledgeNode[] = [
      node('a.md', 'Alpha', ['t']),
      node('b.md', 'Beta', ['t']),
      node('c.md', 'Gamma', ['t']),
    ];
    const edges: KnowledgeEdge[] = [
      { from: 'a.md' as NodeId, to: 'b.md' as NodeId, type: 'LINK', weight: 1 },
      { from: 'b.md' as NodeId, to: 'c.md' as NodeId, type: 'LINK', weight: 1 },
    ];
    const built: KnowledgeGraph = {
      nodes: new Map(nodes.map((n) => [n.id, n])),
      edges,
      builtAt: 't',
      nodeCount: nodes.length,
      edgeCount: edges.length,
    };
    hydrateRuntimeMaps(built);

    const store = new MetadataStore(vaultDir);
    await store.saveGraph(built);
    const loaded = await store.loadGraph();

    const fromBuilt = runSpreadingActivation(built, ['a.md' as NodeId], {
      maxHops: 3,
      threshold: 0.01,
    });
    const fromLoaded = runSpreadingActivation(loaded!, ['a.md' as NodeId], {
      maxHops: 3,
      threshold: 0.01,
    });
    expect(fromLoaded.map((r) => r.nodeId)).toEqual(
      fromBuilt.map((r) => r.nodeId),
    );
    expect(fromLoaded.map((r) => r.score)).toEqual(
      fromBuilt.map((r) => r.score),
    );
  });
});
