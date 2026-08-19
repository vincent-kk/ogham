/**
 * @file metadataStoreLayerGate.test.ts
 * @description 역직렬화 게이트 — 변경 이전 인덱스에 남은 비-레이어 노드가 로드 시
 * 정화된다 (R2 3차 방어선; lens 재수화 경로 포함). dangling edge 도 함께 걸러진다.
 */
import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { hydrateRuntimeMaps } from '../../core/graphBuilder/index.js';
import { MetadataStore } from '../../core/indexer/metadataStore/index.js';
import type { NodeId } from '../../types/common.js';
import type { KnowledgeGraph, KnowledgeNode } from '../../types/graph.js';

let vaultDir: string;

function node(id: string): KnowledgeNode {
  return {
    id: id as NodeId,
    path: id,
    title: id,
    layer: 2,
    tags: ['t'],
    created: '2026-01-01',
    updated: '2026-01-01',
    mtime: 0,
    accessed_count: 0,
  } as KnowledgeNode;
}

beforeEach(() => {
  vaultDir = join(
    tmpdir(),
    `maencof-layergate-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(join(vaultDir, '.maencof'), { recursive: true });
});

afterEach(() => {
  rmSync(vaultDir, { recursive: true, force: true, maxRetries: 3 });
});

describe('deserialize layer gate', () => {
  it('save→load 왕복에서 비-레이어 노드와 그 엣지가 정화된다', async () => {
    const graph: KnowledgeGraph = {
      nodes: new Map([
        ['02_Derived/keep.md' as NodeId, node('02_Derived/keep.md')],
        ['legacy-root.md' as NodeId, node('legacy-root.md')],
      ]),
      edges: [
        {
          from: '02_Derived/keep.md' as NodeId,
          to: 'legacy-root.md' as NodeId,
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
    expect(loaded!.nodes.has('legacy-root.md' as NodeId)).toBe(false);
    expect(loaded!.nodes.has('02_Derived/keep.md' as NodeId)).toBe(true);
    expect(loaded!.edges).toHaveLength(0);
    expect(loaded!.nodeCount).toBe(1);
    expect(loaded!.edgeCount).toBe(0);
  });
});
