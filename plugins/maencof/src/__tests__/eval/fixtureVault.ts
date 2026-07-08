/**
 * @file fixtureVault.ts
 * @description 검색 품질 평가용 결정적 합성 vault — tirnanog 실측 위상 특성 축소 재현.
 *
 * 재현 특성: LINK 고아율 ≥ 50%, 대형 폴더 SIBLING 클리크(20노드), 허브 태그(security),
 * 다경로 수렴 구조(두 시드 → graph-search-synthesis), 어휘 비중첩 연상 경로(ontology-modeling).
 * 랜덤 요소 없음 — 실행 간 완전 동일 그래프를 보장한다.
 */
import {
  buildGraph,
  hydrateRuntimeMaps,
} from '../../core/graphBuilder/index.js';
import { calculateWeights } from '../../core/weightCalculator/index.js';
import { Layer, toNodeId } from '../../types/common.js';
import type { KnowledgeGraph, KnowledgeNode } from '../../types/graph.js';

/** 픽스처 문서 정의 (id는 vault-root 상대 경로) */
interface FixtureDoc {
  path: string;
  title: string;
  layer: Layer;
  tags: string[];
  links?: string[];
  updated?: string;
}

const SECURITY_ARTICLE_COUNT = 20;

const FIXTURE_MTIME = 1750000000000;

function securityArticles(): FixtureDoc[] {
  const docs: FixtureDoc[] = [];
  for (let i = 0; i < SECURITY_ARTICLE_COUNT; i++) {
    const nn = String(i).padStart(2, '0');
    docs.push({
      path: `L3/clippings/security-article-${nn}.md`,
      title: `Security Article ${nn}`,
      layer: Layer.L3_EXTERNAL,
      tags: ['security', 'clipping'],
      updated: '2026-01-15',
    });
  }
  return docs;
}

const FIXTURE_DOCS: FixtureDoc[] = [
  {
    path: 'L1/identity.md',
    title: 'Identity Core',
    layer: Layer.L1_CORE,
    tags: ['identity', 'core'],
  },
  {
    path: 'L1/values.md',
    title: 'Values and Principles',
    layer: Layer.L1_CORE,
    tags: ['identity', 'values'],
  },
  {
    path: 'L2/index.md',
    title: 'Derived Knowledge Index',
    layer: Layer.L2_DERIVED,
    tags: ['index'],
  },
  {
    path: 'L2/insights/knowledge-graph-design.md',
    title: 'Knowledge Graph Design',
    layer: Layer.L2_DERIVED,
    tags: ['graph', 'knowledge', 'architecture'],
    links: [
      'L2/insights/spreading-activation-notes.md',
      'L2/insights/graph-search-synthesis.md',
      'L2/insights/ontology-modeling.md',
    ],
  },
  {
    path: 'L2/insights/spreading-activation-notes.md',
    title: 'Spreading Activation Notes',
    layer: Layer.L2_DERIVED,
    tags: ['search', 'algorithm', 'graph'],
    links: ['L2/insights/graph-search-synthesis.md'],
  },
  {
    path: 'L2/insights/graph-search-synthesis.md',
    title: 'Graph Search Synthesis',
    layer: Layer.L2_DERIVED,
    tags: ['graph', 'search'],
  },
  {
    path: 'L2/insights/ontology-modeling.md',
    title: 'Ontology Modeling',
    layer: Layer.L2_DERIVED,
    tags: ['ontology', 'modeling'],
  },
  {
    path: 'L2/insights/graph-algorithms-survey.md',
    title: 'Graph Algorithms Survey',
    layer: Layer.L2_DERIVED,
    tags: ['graph', 'algorithm'],
    links: ['L2/insights/spreading-activation-notes.md'],
  },
  {
    path: 'L2/insights/personal-memory-systems.md',
    title: 'Personal Memory Systems',
    layer: Layer.L2_DERIVED,
    tags: ['memory', 'knowledge'],
    links: ['L2/insights/knowledge-graph-design.md'],
  },
  {
    path: 'L2/insights/investment-fomo-psychology.md',
    title: 'Investment FOMO Psychology',
    layer: Layer.L2_DERIVED,
    tags: ['investment', 'psychology'],
  },
  {
    path: 'L2/insights/typescript-monorepo-patterns.md',
    title: 'TypeScript Monorepo Patterns',
    layer: Layer.L2_DERIVED,
    tags: ['typescript', 'monorepo', 'architecture'],
    links: ['L2/insights/typescript-type-safety.md'],
  },
  {
    path: 'L2/insights/typescript-type-safety.md',
    title: 'TypeScript Type Safety',
    layer: Layer.L2_DERIVED,
    tags: ['typescript', 'types'],
  },
  {
    path: 'L2/insights/vault-organization.md',
    title: 'Vault Organization',
    layer: Layer.L2_DERIVED,
    tags: ['knowledge', 'organization'],
  },
  {
    path: 'L3/index.md',
    title: 'External Knowledge Index',
    layer: Layer.L3_EXTERNAL,
    tags: ['index'],
  },
  {
    path: 'L3/references/hipporag-paper.md',
    title: 'HippoRAG Paper Summary',
    layer: Layer.L3_EXTERNAL,
    tags: ['graph', 'algorithm', 'paper'],
    links: ['L2/insights/graph-algorithms-survey.md'],
  },
  {
    path: 'L3/references/actr-memory-paper.md',
    title: 'ACT-R Memory Paper',
    layer: Layer.L3_EXTERNAL,
    tags: ['memory', 'paper'],
    links: ['L2/insights/personal-memory-systems.md'],
  },
  {
    path: 'L3/references/bm25-reference.md',
    title: 'BM25 Ranking Reference',
    layer: Layer.L3_EXTERNAL,
    tags: ['search', 'ranking', 'paper'],
  },
  ...securityArticles(),
  {
    path: 'L4/index.md',
    title: 'Action Index',
    layer: Layer.L4_ACTION,
    tags: ['index'],
  },
  {
    path: 'L4/tasks/implement-search-v2.md',
    title: 'Implement Search V2',
    layer: Layer.L4_ACTION,
    tags: ['search', 'task'],
    links: [
      'L2/insights/spreading-activation-notes.md',
      'L2/insights/knowledge-graph-design.md',
    ],
    updated: '2026-07-01',
  },
  {
    path: 'L4/tasks/review-security-articles.md',
    title: 'Review Security Articles',
    layer: Layer.L4_ACTION,
    tags: ['security', 'task'],
    links: [
      'L3/clippings/security-article-00.md',
      'L3/clippings/security-article-01.md',
    ],
    updated: '2026-07-01',
  },
  {
    path: 'L4/tasks/portfolio-rebalance.md',
    title: 'Portfolio Rebalance Plan',
    layer: Layer.L4_ACTION,
    tags: ['investment', 'task'],
    links: ['L2/insights/investment-fomo-psychology.md'],
    updated: '2026-06-20',
  },
  {
    path: 'L4/tasks/write-vault-guide.md',
    title: 'Write Vault Guide',
    layer: Layer.L4_ACTION,
    tags: ['knowledge', 'task'],
    links: ['L2/insights/vault-organization.md'],
    updated: '2026-06-25',
  },
];

function toKnowledgeNode(doc: FixtureDoc): KnowledgeNode {
  const node: KnowledgeNode & { outboundLinks?: string[] } = {
    id: toNodeId(doc.path),
    path: doc.path,
    title: doc.title,
    layer: doc.layer,
    tags: doc.tags,
    created: '2026-01-01',
    updated: doc.updated ?? '2026-03-01',
    mtime: FIXTURE_MTIME,
    accessed_count: 0,
  };
  if (doc.links) node.outboundLinks = doc.links;
  return node;
}

/**
 * 평가용 그래프를 라이브 kg_build와 동일한 파이프라인으로 구축한다:
 * buildGraph → calculateWeights(가중치+pagerank) → hydrateRuntimeMaps.
 */
export function buildEvalGraph(): KnowledgeGraph {
  const nodes = FIXTURE_DOCS.map(toKnowledgeNode);
  const { graph } = buildGraph(nodes);

  const { edges: weightedEdges, pageranks } = calculateWeights(graph);
  graph.edges = weightedEdges;
  graph.edgeCount = weightedEdges.length;
  for (const [nodeId, rank] of pageranks) {
    const node = graph.nodes.get(nodeId);
    if (node) node.pagerank = rank;
  }

  hydrateRuntimeMaps(graph);
  return graph;
}
