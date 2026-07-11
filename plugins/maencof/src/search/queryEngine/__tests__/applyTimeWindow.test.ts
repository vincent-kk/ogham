/**
 * @file applyTimeWindow.test.ts
 * @description updated 시간창으로 SA 결과를 필터링 — since/until, 누락 노드 제외, 무bound 통과.
 */
import { describe, expect, it } from 'vitest';

import type { NodeId } from '../../../types/common.js';
import type {
  ActivationResult,
  KnowledgeGraph,
  KnowledgeNode,
} from '../../../types/graph.js';
import { applyTimeWindow } from '../query/applyTimeWindow.js';

function makeGraph(entries: Array<[string, string]>): KnowledgeGraph {
  const nodes = new Map<NodeId, KnowledgeNode>();
  for (const [id, updated] of entries)
    nodes.set(id as NodeId, { updated } as KnowledgeNode);
  return { nodes } as KnowledgeGraph;
}

function res(id: string): ActivationResult {
  return { nodeId: id as NodeId, score: 1, hops: 0, path: [] };
}

const graph = makeGraph([
  ['a', '2026-01-01'],
  ['b', '2026-06-15'],
  ['c', '2026-12-31'],
]);
const results = [res('a'), res('b'), res('c')];

describe('applyTimeWindow — basic', () => {
  it('no bounds → passthrough (same reference)', () => {
    expect(applyTimeWindow(results, graph)).toBe(results);
  });

  it('since filters out older results (inclusive)', () => {
    const out = applyTimeWindow(results, graph, '2026-06-15');
    expect(out.map((r) => r.nodeId)).toEqual(['b', 'c']);
  });

  it('until filters out newer results (inclusive)', () => {
    const out = applyTimeWindow(results, graph, undefined, '2026-06-15');
    expect(out.map((r) => r.nodeId)).toEqual(['a', 'b']);
  });
});

describe('applyTimeWindow — edge cases', () => {
  it('both bounds keep only the in-range window', () => {
    const out = applyTimeWindow(results, graph, '2026-02-01', '2026-11-01');
    expect(out.map((r) => r.nodeId)).toEqual(['b']);
  });

  it('excludes results whose node is missing from the graph', () => {
    const out = applyTimeWindow([res('ghost'), res('b')], graph, '2026-01-01');
    expect(out.map((r) => r.nodeId)).toEqual(['b']);
  });

  it('since greater than until yields empty results', () => {
    const out = applyTimeWindow(results, graph, '2026-12-31', '2026-01-01');
    expect(out).toEqual([]);
  });

  it('inclusive boundaries retain date == since and date == until', () => {
    const out = applyTimeWindow(results, graph, '2026-01-01', '2026-12-31');
    expect(out.map((r) => r.nodeId)).toEqual(['a', 'b', 'c']);
  });
});
