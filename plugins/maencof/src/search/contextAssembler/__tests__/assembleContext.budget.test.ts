/** @file assembleContext.budget.test.ts 전체 출력과 작은 예산의 계약을 고정한다. */
import { describe, expect, it } from 'vitest';

import { Layer, toNodeId } from '../../../types/common.js';
import type {
  ActivationResult,
  KnowledgeGraph,
  KnowledgeNode,
} from '../../../types/graph.js';
import { assembleContext } from '../operations/assembleContext.js';
import { buildMarkdown } from '../operations/buildMarkdown.js';
import { estimateTokens } from '../operations/estimateTokens.js';
import { toContextItems } from '../operations/toContextItems.js';

/** 예산 경계에서 문서 수와 제외 수가 달라지는 두 후보. */
const nodes: KnowledgeNode[] = ['first', 'second'].map((title) => ({
  id: toNodeId(title),
  path: `${title}.md`,
  title,
  layer: Layer.L1_CORE,
  tags: ['one', 'two', 'three'],
  created: '2026-01-01',
  updated: '2026-01-01',
  mtime: 0,
  accessed_count: 0,
}));
/** 실제 조립 경로가 읽는 최소 그래프. */
const graph: KnowledgeGraph = {
  nodes: new Map(nodes.map((node) => [node.id, node])),
  edges: [],
  builtAt: '',
  nodeCount: 2,
  edgeCount: 0,
};
/** 점수 순서를 고정한 활성화 결과. */
const results: ActivationResult[] = nodes.map((node) => ({
  nodeId: node.id,
  score: 1,
  hops: 0,
  path: [node.id],
}));

describe('assembleContext complete output budget', () => {
  it.each([0, 5])(
    'returns empty markdown and zero tokens below the header at %i',
    (tokenBudget) => {
      expect(assembleContext(results, graph, { tokenBudget })).toEqual({
        markdown: '',
        estimatedTokens: 0,
        items: [],
        truncatedCount: 2,
      });
    },
  );

  it.each([6, 12, 30, 50, 100])(
    'counts the complete output within budget %i',
    (tokenBudget) => {
      const result = assembleContext(results, graph, { tokenBudget });
      expect(estimateTokens(result.markdown)).toBeLessThanOrEqual(tokenBudget);
      expect(result.estimatedTokens).toBe(estimateTokens(result.markdown));
      expect(result.items.length + result.truncatedCount).toBe(2);
    },
  );

  it('includes both count notices at the one-document boundary', () => {
    const items = toContextItems(results, graph);
    const markdown = buildMarkdown(items.slice(0, 1), 1);
    const tokenBudget = estimateTokens(markdown);
    const result = assembleContext(results, graph, { tokenBudget });
    expect(result.markdown).toBe(markdown);
    expect(result.items).toHaveLength(1);
    expect(result.truncatedCount).toBe(1);
    expect(result.estimatedTokens).toBe(tokenBudget);
  });

  it('counts the no-results notice and omits it when it cannot fit', () => {
    const noResults = assembleContext([], graph, { tokenBudget: 100 });
    expect(noResults.estimatedTokens).toBe(estimateTokens(noResults.markdown));
    expect(assembleContext([], graph, { tokenBudget: 6 })).toEqual({
      markdown: '',
      estimatedTokens: 0,
      items: [],
      truncatedCount: 0,
    });
  });
});
