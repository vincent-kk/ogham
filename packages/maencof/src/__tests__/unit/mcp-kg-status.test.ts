/**
 * @file mcp-kg-status.test.ts
 * @description handleKgStatus 유닛 테스트
 */
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleKgStatus } from '../../mcp/tools/kg-status.js';
import { toNodeId } from '../../types/common.js';
import type {
  KnowledgeEdge,
  KnowledgeGraph,
  KnowledgeNode,
} from '../../types/graph.js';

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

async function makeTempVault(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'maencof-test-'));
}

async function removeTempVault(vaultPath: string): Promise<void> {
  await rm(vaultPath, { recursive: true, force: true });
}

function makeNode(id: string, layer: number = 2): KnowledgeNode {
  return {
    id: toNodeId(id),
    path: id,
    title: id,
    layer: layer as 1 | 2 | 3 | 4,
    tags: ['test'],
    created: '2024-01-01',
    updated: '2024-01-01',
    links: [],
    pagerank: 0.15,
    accessedCount: 0,
  };
}

function makeGraph(
  nodes: KnowledgeNode[],
  edges: KnowledgeEdge[] = [],
): KnowledgeGraph {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  return {
    nodes: nodeMap,
    edges,
    builtAt: new Date().toISOString(),
    nodeCount: nodes.size ?? nodes.length,
    edgeCount: edges.length,
  };
}

// ─── handleKgStatus ───────────────────────────────────────────────────────────

describe('handleKgStatus', () => {
  let vault: string;

  beforeEach(async () => {
    vault = await makeTempVault();
  });

  afterEach(async () => {
    await removeTempVault(vault);
  });

  it('graph가 null이면 rebuildRecommended=true를 반환한다', async () => {
    const result = await handleKgStatus(vault, null, {});
    expect(result.nodeCount).toBe(0);
    expect(result.edgeCount).toBe(0);
    expect(result.rebuildRecommended).toBe(true);
    expect(result.freshnessPercent).toBe(0);
  });

  it('정상 그래프에서 freshness를 계산한다', async () => {
    const nodes = [makeNode('a.md'), makeNode('b.md'), makeNode('c.md')];
    const graph = makeGraph(nodes);

    const result = await handleKgStatus(vault, graph, {});
    expect(result.nodeCount).toBe(3);
    expect(result.edgeCount).toBe(0);
    expect(result.freshnessPercent).toBe(100); // stale 없음
    expect(result.rebuildRecommended).toBe(false);
  });

  it('stale-nodes가 있으면 freshnessPercent가 감소한다', async () => {
    const nodes = [
      makeNode('a.md'),
      makeNode('b.md'),
      makeNode('c.md'),
      makeNode('d.md'),
      makeNode('e.md'),
      makeNode('f.md'),
      makeNode('g.md'),
      makeNode('h.md'),
      makeNode('i.md'),
      makeNode('j.md'),
    ];
    const graph = makeGraph(nodes);

    // 노드 10개 중 2개 stale → 80%
    const cacheDir = join(vault, '.maencof');
    await mkdir(cacheDir, { recursive: true });
    await writeFile(
      join(cacheDir, 'stale-nodes.json'),
      JSON.stringify({
        paths: ['a.md', 'b.md'],
        updatedAt: new Date().toISOString(),
      }),
      'utf-8',
    );

    const result = await handleKgStatus(vault, graph, {});
    expect(result.staleNodeCount).toBe(2);
    expect(result.freshnessPercent).toBe(80);
    expect(result.rebuildRecommended).toBe(true); // 2/10 = 20% > 10% 임계값
  });

  it('stale 비율이 10% 초과이면 rebuildRecommended=true', async () => {
    const nodes = Array.from({ length: 10 }, (_, i) =>
      makeNode(`node-${i}.md`),
    );
    const graph = makeGraph(nodes);

    const cacheDir = join(vault, '.maencof');
    await mkdir(cacheDir, { recursive: true });
    await writeFile(
      join(cacheDir, 'stale-nodes.json'),
      JSON.stringify({
        paths: ['node-0.md', 'node-1.md'],
        updatedAt: new Date().toISOString(),
      }),
      'utf-8',
    );

    const result = await handleKgStatus(vault, graph, {});
    expect(result.rebuildRecommended).toBe(true);
  });

  it('vaultPath를 결과에 포함한다', async () => {
    const result = await handleKgStatus(vault, null, {});
    expect(result.vaultPath).toBe(vault);
  });
});
