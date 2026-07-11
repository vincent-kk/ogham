/**
 * @file kgTimeline.test.ts
 * @description kg_timeline 핸들러 — 최신순 정렬, limit, 시간창, layer/sub_layer 필터, null graph, totalMatched.
 */
import { describe, expect, it } from 'vitest';

import { Layer } from '../../../../types/common.js';
import type { NodeId, SubLayer } from '../../../../types/common.js';
import type { KnowledgeGraph, KnowledgeNode } from '../../../../types/graph.js';
import type { KgTimelineResult } from '../../../../types/mcpKg.js';
import { handleKgTimeline } from '../kgTimeline.js';

function mkNode(
  path: string,
  updated: string,
  opts: { layer?: Layer; subLayer?: SubLayer; gist?: string } = {},
): KnowledgeNode {
  return {
    id: path as NodeId,
    path,
    title: path,
    layer: opts.layer ?? Layer.L2_DERIVED,
    tags: [],
    created: '2026-01-01',
    updated,
    mtime: 0,
    accessed_count: 0,
    subLayer: opts.subLayer,
    gist: opts.gist,
  } as KnowledgeNode;
}

function makeGraph(nodes: KnowledgeNode[]): KnowledgeGraph {
  return { nodes: new Map(nodes.map((n) => [n.id, n])) } as KnowledgeGraph;
}

function ok(r: KgTimelineResult | { error: string }): KgTimelineResult {
  if ('error' in r) throw new Error(r.error);
  return r;
}

describe('handleKgTimeline — basic', () => {
  it('sorts by updated descending (newest first)', () => {
    const g = makeGraph([
      mkNode('a.md', '2026-01-01'),
      mkNode('b.md', '2026-06-15'),
      mkNode('c.md', '2026-03-10'),
    ]);
    const out = ok(handleKgTimeline(g, {}));
    expect(out.results.map((r) => r.path)).toEqual(['b.md', 'c.md', 'a.md']);
  });

  it('applies limit and reports totalMatched >= results.length', () => {
    const g = makeGraph([
      mkNode('a.md', '2026-01-01'),
      mkNode('b.md', '2026-02-01'),
      mkNode('c.md', '2026-03-01'),
    ]);
    const out = ok(handleKgTimeline(g, { limit: 2 }));
    expect(out.results.map((r) => r.path)).toEqual(['c.md', 'b.md']);
    expect(out.totalMatched).toBe(3);
    expect(out.totalMatched).toBeGreaterThanOrEqual(out.results.length);
  });

  it('null graph returns the not-built error', () => {
    const out = handleKgTimeline(null, {});
    expect(out).toEqual({
      error: 'Index not built. Please run /maencof:build first.',
    });
  });
});

describe('handleKgTimeline — filters', () => {
  it('since bound keeps updated >= since', () => {
    const g = makeGraph([
      mkNode('a.md', '2026-01-01'),
      mkNode('b.md', '2026-06-15'),
    ]);
    const out = ok(handleKgTimeline(g, { since: '2026-06-15' }));
    expect(out.results.map((r) => r.path)).toEqual(['b.md']);
  });

  it('until bound keeps updated <= until', () => {
    const g = makeGraph([
      mkNode('a.md', '2026-01-01'),
      mkNode('b.md', '2026-06-15'),
    ]);
    const out = ok(handleKgTimeline(g, { until: '2026-01-01' }));
    expect(out.results.map((r) => r.path)).toEqual(['a.md']);
  });

  it('both bounds keep the in-range window', () => {
    const g = makeGraph([
      mkNode('a.md', '2026-01-01'),
      mkNode('b.md', '2026-06-15'),
      mkNode('c.md', '2026-12-31'),
    ]);
    const out = ok(
      handleKgTimeline(g, { since: '2026-03-01', until: '2026-09-01' }),
    );
    expect(out.results.map((r) => r.path)).toEqual(['b.md']);
  });

  it('layer_filter restricts to the given layers', () => {
    const g = makeGraph([
      mkNode('a.md', '2026-01-01', { layer: Layer.L1_CORE }),
      mkNode('b.md', '2026-02-01', { layer: Layer.L4_ACTION }),
    ]);
    const out = ok(handleKgTimeline(g, { layer_filter: [Layer.L1_CORE] }));
    expect(out.results.map((r) => r.path)).toEqual(['a.md']);
  });

  it('sub_layer restricts to matching subLayer', () => {
    const g = makeGraph([
      mkNode('a.md', '2026-01-01', { subLayer: 'topical' }),
      mkNode('b.md', '2026-02-01', { subLayer: 'structural' }),
    ]);
    const out = ok(handleKgTimeline(g, { sub_layer: 'structural' }));
    expect(out.results.map((r) => r.path)).toEqual(['b.md']);
  });

  it('item shape carries created/layer/gist through', () => {
    const g = makeGraph([
      mkNode('a.md', '2026-05-01', { layer: Layer.L3_EXTERNAL, gist: 'g' }),
    ]);
    const item = ok(handleKgTimeline(g, {})).results[0]!;
    expect(item).toEqual({
      path: 'a.md',
      title: 'a.md',
      updated: '2026-05-01',
      created: '2026-01-01',
      layer: Layer.L3_EXTERNAL,
      gist: 'g',
    });
  });
});
