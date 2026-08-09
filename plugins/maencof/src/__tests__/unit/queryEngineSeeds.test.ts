/**
 * @file queryEngineSeeds.test.ts
 * @description 시드 해석 — 다토큰 AND, phrase 보너스, 경계 path prefix, 허브 시드 budget.
 */
import { describe, expect, it } from 'vitest';

import { COMPOUND_OR_MATCH_SCORE } from '../../constants/queryEngine.js';
import { hydrateRuntimeMaps } from '../../core/graphBuilder/index.js';
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
    const ids = resolveSeedNodes(g, ['investment fomo']).scored.map(
      (s) => s.nodeId,
    );
    expect(ids).toContain('inv-fomo.md');
    expect(ids).not.toContain('inv.md');
    expect(ids).not.toContain('other.md');
  });

  it('hyphen and space separators are equivalent under tokenization', () => {
    const g = makeGraph([node('inv-fomo.md', 'investment-fomo', ['finance'])]);
    const spaced = resolveSeedNodes(g, ['investment fomo']).scored.map(
      (s) => s.nodeId,
    );
    const hyphen = resolveSeedNodes(g, ['investment-fomo']).scored.map(
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
    const seeds = resolveSeedNodes(g, ['investment fomo']).scored;
    const a = seeds.find((s) => s.nodeId === ('a.md' as NodeId))!;
    const b = seeds.find((s) => s.nodeId === ('b.md' as NodeId))!;
    expect(a.matchScore).toBeGreaterThan(b.matchScore);
  });

  it('single-token keyword keeps title-word classification', () => {
    const g = makeGraph([node('a.md', 'investment thesis', ['t'])]);
    const seed = resolveSeedNodes(g, ['investment']).scored[0]!;
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
    const seeds = resolveSeedNodes(g, ['docs/cve']).scored;
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
    const seeds = resolveSeedNodes(g, ['hub']).scored;
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

    const seeds = resolveSeedNodes(g, ['security']).scored;
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
    const seeds = resolveSeedNodes(g, ['n3r', 'transition']).scored;
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
    const seeds = resolveSeedNodes(g, ['transition']).scored;
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

describe('resolveSeedNodes — seed resolution counts', () => {
  it('unmatched keyword seed counts zero and contributes no nodes', () => {
    const g = makeGraph([node('a.md', 'investment thesis', ['finance'])]);
    const r = resolveSeedNodes(g, ['wxyzq']);
    expect(r.scored).toHaveLength(0);
    expect(r.seedCounts).toEqual({ wxyzq: 0 });
  });

  it('mixed seeds report per-seed counts with zero for dead ones', () => {
    const g = makeGraph([
      node('a.md', 'investment thesis', ['finance']),
      node('b.md', 'investment fomo', ['finance']),
    ]);
    const r = resolveSeedNodes(g, ['investment', 'wxyzq']);
    expect(r.seedCounts['investment']).toBe(2);
    expect(r.seedCounts['wxyzq']).toBe(0);
    expect(r.scored.length).toBeGreaterThan(0);
  });

  it('AND-failed multi-token phrase seed counts zero', () => {
    const g = makeGraph([node('a.md', 'investment thesis', ['finance'])]);
    const r = resolveSeedNodes(g, ['investment zebra']);
    expect(r.seedCounts['investment zebra']).toBe(0);
  });

  it('path seeds count exact hit as one and folder members by count', () => {
    const g = makeGraph([
      node('docs/cve/a.md', 'A'),
      node('docs/cve/b.md', 'B'),
    ]);
    const r = resolveSeedNodes(g, ['docs/cve', 'docs/x.md']);
    expect(r.seedCounts['docs/cve']).toBe(2);
    expect(r.seedCounts['docs/x.md']).toBe(0);
    const exact = resolveSeedNodes(g, ['docs/cve/a.md']);
    expect(exact.seedCounts['docs/cve/a.md']).toBe(1);
  });

  it('duplicate seeds collapse to one count key', () => {
    const g = makeGraph([node('a.md', 'investment thesis')]);
    const r = resolveSeedNodes(g, ['wxyzq', 'wxyzq']);
    expect(Object.keys(r.seedCounts)).toEqual(['wxyzq']);
  });

  it('query always carries seedCounts and preserves it on cache hits', () => {
    const g = makeGraph([node('a.md', 'investment thesis', ['finance'])]);
    const first = query(g, ['investment', 'wxyzq']);
    expect(first.seedCounts['investment']).toBe(1);
    expect(first.seedCounts['wxyzq']).toBe(0);
    const cached = query(g, ['investment', 'wxyzq']);
    expect(cached.seedCounts).toEqual(first.seedCounts);
    const allResolved = query(g, ['investment']);
    expect(allResolved.seedCounts).toEqual({ investment: 1 });
  });
});

describe('resolveSeedNodes — compound seed (raw-first + OR fallback)', () => {
  it('raw tag hit resolves verbatim as tag-exact without decomposition', () => {
    const g = makeGraph([
      node('a.md', '주간보고 루틴', ['weekly-report', 'routine']),
      node('b.md', 'weekly digest', ['digest']),
    ]);
    const r = resolveSeedNodes(g, ['weekly-report']);
    expect(r.seedCounts['weekly-report']).toBe(1);
    const seed = r.scored.find((s) => s.nodeId === ('a.md' as NodeId))!;
    expect(seed.matchType).toBe('tag-exact');
    expect(seed.matchScore).toBeCloseTo(0.5, 5);
  });

  it('raw miss with a live AND intersection keeps existing multi-token behavior', () => {
    const g = makeGraph([
      node('full.md', 'graph search synthesis', ['graph', 'search']),
      node('part.md', 'graph algorithms', ['graph']),
    ]);
    const r = resolveSeedNodes(g, ['graph-search']);
    const ids = r.scored.map((s) => s.nodeId);
    expect(ids).toContain('full.md');
    // AND 가 살아 있으면 OR 확장이 일어나지 않는다 — 부분 매칭 노드 유입 없음
    expect(ids).not.toContain('part.md');
    const full = r.scored.find((s) => s.nodeId === ('full.md' as NodeId))!;
    expect(full.matchType).not.toBe('compound-or');
    expect(r.seedCounts['graph-search']).toBe(1);
  });

  it('raw miss with empty AND falls back to OR at compound-or low score', () => {
    const g = makeGraph([
      node('g.md', 'graph algorithms', ['graph']),
      node('s.md', 'search notes', ['search']),
    ]);
    const r = resolveSeedNodes(g, ['graph-search']);
    const gSeed = r.scored.find((s) => s.nodeId === ('g.md' as NodeId))!;
    const sSeed = r.scored.find((s) => s.nodeId === ('s.md' as NodeId))!;
    expect(gSeed.matchType).toBe('compound-or');
    expect(sSeed.matchType).toBe('compound-or');
    expect(gSeed.matchScore).toBeCloseTo(COMPOUND_OR_MATCH_SCORE, 5);
    expect(r.seedCounts['graph-search']).toBe(2);
  });

  it('OR fallback ignores sub-2-char tokens', () => {
    const g = makeGraph([
      node('act-only.md', 'action items', ['task']),
      node('r-only.md', 'r language notes', ['lang']),
    ]);
    const r = resolveSeedNodes(g, ['act-r']);
    const ids = r.scored.map((s) => s.nodeId);
    // 'r' 단독 매칭 노드는 폴백 union 에 들어오지 않는다 (1자 토큰 prefix 폭발 차단)
    expect(ids).toContain('act-only.md');
    expect(ids).not.toContain('r-only.md');
    expect(r.seedCounts['act-r']).toBe(1);
  });

  it('prefix-only raw hit must not preempt the AND path', () => {
    const g = makeGraph([
      node('full.md', 'graph search synthesis', ['graph', 'search']),
      node('noise.md', 'unrelated note', ['graph-searching-tips']),
    ]);
    const r = resolveSeedNodes(g, ['graph-search']);
    // 원형 완전 일치가 없으면(접두 태그만 존재) 분해 AND 가 정답 문서를 지켜야 한다
    const full = r.scored.find((s) => s.nodeId === ('full.md' as NodeId))!;
    expect(full).toBeDefined();
    expect(full.matchType).toBe('title-word');
    expect(full.matchScore).toBeCloseTo(0.95, 5);
    expect(r.scored.map((s) => s.nodeId)).not.toContain('noise.md');
  });

  it('punctuated natural-language words are not compound — no OR noise, honest zero count', () => {
    const g = makeGraph([
      node('w1.md', 'whatever manifest', ['ops']),
      node('w2.md', 'whatsapp export notes', ['chat']),
    ]);
    const r = resolveSeedNodes(g, ["what's"]);
    // kebab/snake 분리자가 없는 구두점 단어는 compound 가 아니다 — AND 공집합은
    // OR 로 확장되지 않고 미해석(계수 0)으로 정직하게 보고된다
    expect(r.scored).toHaveLength(0);
    expect(r.seedCounts["what's"]).toBe(0);
  });

  it('dotted seeds stay on the plain multi-token AND path', () => {
    const g = makeGraph([
      node('a.md', 'node js runtime', ['runtime']),
      node('b.md', 'node patterns', ['node']),
    ]);
    const r = resolveSeedNodes(g, ['Node.js']);
    const ids = r.scored.map((s) => s.nodeId);
    expect(ids).toContain('a.md');
    expect(ids).not.toContain('b.md');
    expect(r.scored.every((s) => s.matchType !== 'compound-or')).toBe(true);
  });

  it('seedCounts reports prototype-named seeds instead of dropping them', () => {
    const g = makeGraph([node('a.md', 'investment thesis', ['finance'])]);
    const r = resolveSeedNodes(g, ['__proto__', 'investment']);
    expect(Object.keys(r.seedCounts).sort()).toEqual(
      ['__proto__', 'investment'].sort(),
    );
    expect(r.seedCounts['__proto__']).toBe(0);
    expect(r.seedCounts['investment']).toBe(1);
  });
});
