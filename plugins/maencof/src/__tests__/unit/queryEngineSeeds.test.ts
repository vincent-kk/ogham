/**
 * @file queryEngineSeeds.test.ts
 * @description 시드 해석 — 다토큰 AND, phrase 보너스, 경계 path prefix, 허브 시드 budget.
 */
import { describe, expect, it } from 'vitest';

import { hydrateRuntimeMaps } from '../../core/graphBuilder/graphBuilder.js';
import {
  deriveContextSeeds,
  query,
  resolveSeedNodes,
} from '../../search/queryEngine/index.js';
import type { NodeId } from '../../types/common.js';
import type { KnowledgeGraph, KnowledgeNode } from '../../types/graph.js';

function node(
  id: string,
  title = id,
  tags: string[] = [],
  pagerank = 0,
): KnowledgeNode {
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
    pagerank,
  } as KnowledgeNode;
}

function makeGraph(nodes: KnowledgeNode[]): KnowledgeGraph {
  const g: KnowledgeGraph = {
    nodes: new Map(nodes.map((n) => [n.id, n])),
    edges: [],
    builtAt: 't',
    nodeCount: nodes.length,
    edgeCount: 0,
  };
  hydrateRuntimeMaps(g);
  return g;
}

describe('resolveSeedNodes — PP2 tokenization', () => {
  it('single seed string with a space resolves via multi-token AND', () => {
    const g = makeGraph([
      node('inv-fomo.md', 'investment-fomo', ['finance']),
      node('inv.md', 'investment thesis', ['finance']),
      node('other.md', 'fomo culture', ['psychology']),
    ]);
    const ids = resolveSeedNodes(g, ['investment fomo']).map((s) => s.nodeId);
    expect(ids).toContain('inv-fomo.md');
    expect(ids).not.toContain('inv.md');
    expect(ids).not.toContain('other.md');
  });

  it('hyphen and space separators are equivalent under tokenization', () => {
    const g = makeGraph([node('inv-fomo.md', 'investment-fomo', ['finance'])]);
    const spaced = resolveSeedNodes(g, ['investment fomo']).map(
      (s) => s.nodeId,
    );
    const hyphen = resolveSeedNodes(g, ['investment-fomo']).map(
      (s) => s.nodeId,
    );
    expect(spaced).toEqual(hyphen);
    expect(spaced).toContain('inv-fomo.md');
  });

  it('phrase contiguity scores higher than scattered token matches', () => {
    const g = makeGraph([
      node('a.md', 'investment fomo guide', ['t']),
      node('b.md', 'fomo and investment notes', ['t']),
    ]);
    const seeds = resolveSeedNodes(g, ['investment fomo']);
    const a = seeds.find((s) => s.nodeId === ('a.md' as NodeId))!;
    const b = seeds.find((s) => s.nodeId === ('b.md' as NodeId))!;
    expect(a.matchScore).toBeGreaterThan(b.matchScore);
  });

  it('single-token keyword keeps title-word classification', () => {
    const g = makeGraph([node('a.md', 'investment thesis', ['t'])]);
    const seed = resolveSeedNodes(g, ['investment'])[0]!;
    expect(seed.matchType).toBe('title-word');
  });
});

describe('resolveSeedNodes — PP2 path prefix + PP3 budget', () => {
  it('folder path resolves bounded members and never marks them path-exact', () => {
    const g = makeGraph([
      node('docs/cve/a.md', 'A'),
      node('docs/cve/b.md', 'B'),
      node('docs/other/c.md', 'C'),
    ]);
    const seeds = resolveSeedNodes(g, ['docs/cve']);
    const ids = seeds.map((s) => s.nodeId);
    expect(ids).toContain('docs/cve/a.md');
    expect(ids).toContain('docs/cve/b.md');
    expect(ids).not.toContain('docs/other/c.md');
    expect(seeds.every((s) => s.matchType !== 'path-exact')).toBe(true);
  });

  it('exact path seed stays path-exact and is excluded from query results', () => {
    const g = makeGraph([node('docs/x.md', 'X'), node('docs/y.md', 'Y')]);
    const r = query(g, ['docs/x.md']);
    expect(
      r.results.find((n) => n.nodeId === ('docs/x.md' as NodeId)),
    ).toBeUndefined();
  });

  it('hub keyword seed is capped to the seed budget by pagerank', () => {
    const nodes = Array.from({ length: 40 }, (_, i) =>
      node(`h${i}.md`, `T${i}`, ['hub'], i),
    );
    const g = makeGraph(nodes);
    const seeds = resolveSeedNodes(g, ['hub']);
    expect(seeds.length).toBe(30);
    expect(seeds.map((s) => s.nodeId)).toContain('h39.md');
    expect(seeds.map((s) => s.nodeId)).not.toContain('h0.md');
  });

  it('budget keeps a low-pagerank title match over high-pagerank tag matches', () => {
    const nodes: KnowledgeNode[] = [];
    // 35 high-pagerank tag-only matches (tag-exact 0.5)
    for (let i = 0; i < 35; i++)
      nodes.push(node(`tag${i}.md`, `T${i}`, ['security'], 100 + i));

    // one low-pagerank title-exact match (1.0) — must survive the budget
    nodes.push(node('the-doc.md', 'security', [], 0));
    const g = makeGraph(nodes);

    const seeds = resolveSeedNodes(g, ['security']);
    expect(seeds.length).toBe(30);
    const titleSeed = seeds.find((s) => s.nodeId === ('the-doc.md' as NodeId));
    expect(titleSeed).toBeDefined();
    expect(titleSeed!.matchType).toBe('title-exact');
  });
});

describe('resolveSeedNodes — relative IDF + context seed derivation', () => {
  it('common-token seeds are demoted relative to the rarest query token', () => {
    const g = makeGraph([
      node('rare.md', 'n3r plan'),
      node('common1.md', 'transition ui'),
      node('common2.md', 'transition currency'),
      node('common3.md', 'transition habits'),
    ]);
    const seeds = resolveSeedNodes(g, ['n3r', 'transition']);
    const score = (id: string) =>
      seeds.find((s) => s.nodeId === (id as NodeId))!.matchScore;
    expect(score('rare.md')).toBeCloseTo(0.8, 5);
    expect(score('common1.md')).toBeLessThan(score('rare.md'));
    // 후보 union 불변 — 흔한 토큰 매칭도 강등될 뿐 시드에서 탈락하지 않는다
    expect(seeds.length).toBe(4);
  });

  it('single-token queries keep pre-IDF scores (scale 1 invariance)', () => {
    const g = makeGraph([
      node('a.md', 'transition ui'),
      node('b.md', 'transition currency'),
      node('c.md', 'other topic', ['transition']),
    ]);
    const seeds = resolveSeedNodes(g, ['transition']);
    const score = (id: string) =>
      seeds.find((s) => s.nodeId === (id as NodeId))!.matchScore;
    expect(score('a.md')).toBeCloseTo(0.8, 5);
    expect(score('c.md')).toBeCloseTo(0.5, 5);
  });

  it('deriveContextSeeds keeps words and adds deduplicated adjacent bigrams', () => {
    expect(deriveContextSeeds('docker image optimization')).toEqual([
      'docker',
      'image',
      'optimization',
      'docker image',
      'image optimization',
    ]);
    expect(deriveContextSeeds('graph')).toEqual(['graph']);
    expect(deriveContextSeeds('  spaced   out  ')).toEqual([
      'spaced',
      'out',
      'spaced out',
    ]);
  });
});
