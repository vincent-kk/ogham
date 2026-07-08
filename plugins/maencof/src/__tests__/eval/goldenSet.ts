/**
 * @file goldenSet.ts
 * @description 검색 품질 골든 쿼리셋 — fixtureVault 위상에 대한 (시드, graded relevance) 판정.
 *
 * 등급: 2=핵심, 1=관련, 0(생략)=무관. 판정 근거는 픽스처의 링크/주제 구조
 * (.metadata/maencof/TOOL/Query-Gated-Accumulative-Spreading-Activation/03장 쿼리 유형 계층).
 * 케이스 추가 시 baseline.json을 같은 커밋에서 재기록한다 (ratchet 규칙 3).
 */

/** 골든 쿼리 항목 */
export interface GoldenQuery {
  id: string;
  /** query() seeds 인자 */
  seeds: string[];
  /** path → 등급(1|2). 미기재 경로는 0. */
  relevance: Record<string, 1 | 2>;
}

export const GOLDEN_QUERIES: GoldenQuery[] = [
  {
    id: 'single-title-exact',
    seeds: ['Spreading Activation Notes'],
    relevance: {
      'L2/insights/spreading-activation-notes.md': 2,
      'L2/insights/graph-search-synthesis.md': 2,
      'L2/insights/knowledge-graph-design.md': 1,
      'L2/insights/graph-algorithms-survey.md': 1,
    },
  },
  {
    id: 'phrase-knowledge-graph',
    seeds: ['knowledge graph'],
    relevance: {
      'L2/insights/knowledge-graph-design.md': 2,
      'L2/insights/graph-search-synthesis.md': 2,
      'L2/insights/spreading-activation-notes.md': 1,
      'L2/insights/personal-memory-systems.md': 1,
      'L2/insights/graph-algorithms-survey.md': 1,
    },
  },
  {
    id: 'convergence-two-seeds',
    seeds: ['knowledge graph', 'spreading activation'],
    relevance: {
      'L2/insights/graph-search-synthesis.md': 2,
      'L2/insights/knowledge-graph-design.md': 2,
      'L2/insights/spreading-activation-notes.md': 2,
      'L2/insights/ontology-modeling.md': 1,
      'L2/insights/graph-algorithms-survey.md': 1,
    },
  },
  {
    id: 'hub-noise-review',
    seeds: ['review articles'],
    relevance: {
      'L4/tasks/review-security-articles.md': 2,
      'L3/clippings/security-article-00.md': 1,
      'L3/clippings/security-article-01.md': 1,
    },
  },
  {
    id: 'hub-tag-security',
    seeds: ['security'],
    relevance: {
      'L4/tasks/review-security-articles.md': 2,
      'L3/clippings/security-article-00.md': 1,
      'L3/clippings/security-article-01.md': 1,
      'L3/clippings/security-article-02.md': 1,
      'L3/clippings/security-article-03.md': 1,
      'L3/clippings/security-article-04.md': 1,
      'L3/clippings/security-article-05.md': 1,
      'L3/clippings/security-article-06.md': 1,
      'L3/clippings/security-article-07.md': 1,
      'L3/clippings/security-article-08.md': 1,
      'L3/clippings/security-article-09.md': 1,
      'L3/clippings/security-article-10.md': 1,
      'L3/clippings/security-article-11.md': 1,
      'L3/clippings/security-article-12.md': 1,
      'L3/clippings/security-article-13.md': 1,
      'L3/clippings/security-article-14.md': 1,
      'L3/clippings/security-article-15.md': 1,
      'L3/clippings/security-article-16.md': 1,
      'L3/clippings/security-article-17.md': 1,
      'L3/clippings/security-article-18.md': 1,
      'L3/clippings/security-article-19.md': 1,
    },
  },
  {
    id: 'memory-association',
    seeds: ['memory'],
    relevance: {
      'L2/insights/personal-memory-systems.md': 2,
      'L3/references/actr-memory-paper.md': 2,
      'L2/insights/knowledge-graph-design.md': 1,
    },
  },
  {
    id: 'typescript-topic',
    seeds: ['typescript'],
    relevance: {
      'L2/insights/typescript-monorepo-patterns.md': 2,
      'L2/insights/typescript-type-safety.md': 2,
    },
  },
  {
    id: 'investment-single',
    seeds: ['investment'],
    relevance: {
      'L2/insights/investment-fomo-psychology.md': 2,
      'L4/tasks/portfolio-rebalance.md': 2,
    },
  },
  {
    id: 'folder-browse',
    seeds: ['L2/insights'],
    relevance: {
      'L2/insights/knowledge-graph-design.md': 1,
      'L2/insights/spreading-activation-notes.md': 1,
      'L2/insights/graph-search-synthesis.md': 1,
      'L2/insights/ontology-modeling.md': 1,
      'L2/insights/graph-algorithms-survey.md': 1,
      'L2/insights/personal-memory-systems.md': 1,
      'L2/insights/investment-fomo-psychology.md': 1,
      'L2/insights/typescript-monorepo-patterns.md': 1,
      'L2/insights/typescript-type-safety.md': 1,
      'L2/insights/vault-organization.md': 1,
    },
  },
  {
    id: 'task-context',
    seeds: ['implement search'],
    relevance: {
      'L4/tasks/implement-search-v2.md': 2,
      'L2/insights/spreading-activation-notes.md': 2,
      'L2/insights/knowledge-graph-design.md': 2,
      'L2/insights/graph-search-synthesis.md': 1,
    },
  },
  {
    id: 'algorithm-tag',
    seeds: ['algorithm'],
    relevance: {
      'L2/insights/graph-algorithms-survey.md': 2,
      'L2/insights/spreading-activation-notes.md': 1,
      'L3/references/hipporag-paper.md': 1,
      'L2/insights/graph-search-synthesis.md': 1,
    },
  },
  {
    id: 'l1-values',
    seeds: ['values'],
    relevance: {
      'L1/values.md': 2,
      'L1/identity.md': 1,
    },
  },
];
