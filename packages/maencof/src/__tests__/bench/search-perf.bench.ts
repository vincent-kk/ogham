/**
 * @file search-perf.bench.ts
 * @description SA 검색 파이프라인 성능 벤치마크 — Phase A 최적화 전후 비교
 */
import { bench, describe } from 'vitest';

import { buildGraph } from '../../core/graph-builder/graph-builder.js';
import { runSpreadingActivation } from '../../core/spreading-activation/spreading-activation.js';
import { resolveSeedNodes } from '../../search/query-engine/query-engine.js';
import { Layer } from '../../types/common.js';
import { toNodeId } from '../../types/common.js';
import type { KnowledgeGraph, KnowledgeNode } from '../../types/graph.js';

/** 합성 노드 생성 */
function makeSyntheticNode(i: number, layer: Layer): KnowledgeNode {
  const id = `doc-${i}.md`;
  const subdir = `group-${Math.floor(i / 10)}`;
  return {
    id: toNodeId(id),
    path: `L${layer}/${subdir}/${id}`,
    title: `Document ${i} about topic-${i % 20}`,
    layer,
    tags: [`tag-${i % 10}`, `category-${i % 5}`],
    created: '2026-01-01',
    updated: '2026-01-01',
    mtime: Date.now(),
    accessed_count: 0,
  };
}

/** 합성 그래프 생성 (노드 수, 엣지 밀도 지정) */
function makeSyntheticGraph(nodeCount: number): KnowledgeGraph {
  const layers = [
    Layer.L1_CORE,
    Layer.L2_DERIVED,
    Layer.L3_EXTERNAL,
    Layer.L4_ACTION,
    Layer.L5_CONTEXT,
  ];
  const nodes: KnowledgeNode[] = [];

  for (let i = 0; i < nodeCount; i++) {
    const layer = layers[i % layers.length];
    nodes.push(makeSyntheticNode(i, layer));
  }

  // buildGraph가 SIBLING/PARENT_OF/CHILD_OF 엣지를 자동 생성
  // 추가로 outboundLinks를 통해 LINK 엣지도 생성
  for (let i = 0; i < nodeCount; i++) {
    const ext = nodes[i] as KnowledgeNode & { outboundLinks?: string[] };
    const links: string[] = [];
    // 각 노드에서 3-5개 랜덤 링크
    const linkCount = 3 + (i % 3);
    for (let j = 0; j < linkCount; j++) {
      const target = (i + j + 1) % nodeCount;
      links.push(`doc-${target}.md`);
    }
    ext.outboundLinks = links;
  }

  const { graph } = buildGraph(nodes);
  return graph;
}

// Pre-built graphs for benchmarks
const graph100 = makeSyntheticGraph(100);
const graph500 = makeSyntheticGraph(500);
const graph1000 = makeSyntheticGraph(1000);

describe('SA execution', () => {
  bench('100 nodes', () => {
    runSpreadingActivation(graph100, [toNodeId('doc-0.md')]);
  });

  bench('500 nodes', () => {
    runSpreadingActivation(graph500, [toNodeId('doc-0.md')]);
  });

  bench('1000 nodes', () => {
    runSpreadingActivation(graph1000, [toNodeId('doc-0.md')]);
  });
});

describe('Keyword seed resolution', () => {
  bench('100 nodes - keyword', () => {
    resolveSeedNodes(graph100, ['topic-5']);
  });

  bench('500 nodes - keyword', () => {
    resolveSeedNodes(graph500, ['topic-5']);
  });

  bench('1000 nodes - keyword', () => {
    resolveSeedNodes(graph1000, ['topic-5']);
  });
});

describe('Edge weight lookup (SA with multiple seeds)', () => {
  bench('100 nodes - 3 seeds', () => {
    runSpreadingActivation(graph100, [
      toNodeId('doc-0.md'),
      toNodeId('doc-25.md'),
      toNodeId('doc-50.md'),
    ]);
  });

  bench('500 nodes - 3 seeds', () => {
    runSpreadingActivation(graph500, [
      toNodeId('doc-0.md'),
      toNodeId('doc-125.md'),
      toNodeId('doc-250.md'),
    ]);
  });
});
