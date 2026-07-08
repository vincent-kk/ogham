/**
 * 동결 픽스처(42노드) + 골든 쿼리셋(12건) — plugins/maencof src/__tests__/eval/
 * fixtureVault.ts / goldenSet.ts 의 2026-07-08 스냅샷 이식. 동결 지표의 분모이므로
 * 수정 금지 (src 골든셋은 이후 진화하며, 아카이브는 이 스냅샷으로 고정 비교한다).
 */
import {
  buildGraph,
  calculateWeights,
  hydrateRuntimeMaps,
} from "./graphBuild.mjs";

const SECURITY_ARTICLE_COUNT = 20;
const FIXTURE_MTIME = 1750000000000;

function securityArticles() {
  const docs = [];
  for (let i = 0; i < SECURITY_ARTICLE_COUNT; i++) {
    const nn = String(i).padStart(2, "0");
    docs.push({
      path: `L3/clippings/security-article-${nn}.md`,
      title: `Security Article ${nn}`,
      layer: 3,
      tags: ["security", "clipping"],
      updated: "2026-01-15",
    });
  }
  return docs;
}

const FIXTURE_DOCS = [
  {
    path: "L1/identity.md",
    title: "Identity Core",
    layer: 1,
    tags: ["identity", "core"],
  },
  {
    path: "L1/values.md",
    title: "Values and Principles",
    layer: 1,
    tags: ["identity", "values"],
  },
  {
    path: "L2/index.md",
    title: "Derived Knowledge Index",
    layer: 2,
    tags: ["index"],
  },
  {
    path: "L2/insights/knowledge-graph-design.md",
    title: "Knowledge Graph Design",
    layer: 2,
    tags: ["graph", "knowledge", "architecture"],
    links: [
      "L2/insights/spreading-activation-notes.md",
      "L2/insights/graph-search-synthesis.md",
      "L2/insights/ontology-modeling.md",
    ],
  },
  {
    path: "L2/insights/spreading-activation-notes.md",
    title: "Spreading Activation Notes",
    layer: 2,
    tags: ["search", "algorithm", "graph"],
    links: ["L2/insights/graph-search-synthesis.md"],
  },
  {
    path: "L2/insights/graph-search-synthesis.md",
    title: "Graph Search Synthesis",
    layer: 2,
    tags: ["graph", "search"],
  },
  {
    path: "L2/insights/ontology-modeling.md",
    title: "Ontology Modeling",
    layer: 2,
    tags: ["ontology", "modeling"],
  },
  {
    path: "L2/insights/graph-algorithms-survey.md",
    title: "Graph Algorithms Survey",
    layer: 2,
    tags: ["graph", "algorithm"],
    links: ["L2/insights/spreading-activation-notes.md"],
  },
  {
    path: "L2/insights/personal-memory-systems.md",
    title: "Personal Memory Systems",
    layer: 2,
    tags: ["memory", "knowledge"],
    links: ["L2/insights/knowledge-graph-design.md"],
  },
  {
    path: "L2/insights/investment-fomo-psychology.md",
    title: "Investment FOMO Psychology",
    layer: 2,
    tags: ["investment", "psychology"],
  },
  {
    path: "L2/insights/typescript-monorepo-patterns.md",
    title: "TypeScript Monorepo Patterns",
    layer: 2,
    tags: ["typescript", "monorepo", "architecture"],
    links: ["L2/insights/typescript-type-safety.md"],
  },
  {
    path: "L2/insights/typescript-type-safety.md",
    title: "TypeScript Type Safety",
    layer: 2,
    tags: ["typescript", "types"],
  },
  {
    path: "L2/insights/vault-organization.md",
    title: "Vault Organization",
    layer: 2,
    tags: ["knowledge", "organization"],
  },
  {
    path: "L3/index.md",
    title: "External Knowledge Index",
    layer: 3,
    tags: ["index"],
  },
  {
    path: "L3/references/hipporag-paper.md",
    title: "HippoRAG Paper Summary",
    layer: 3,
    tags: ["graph", "algorithm", "paper"],
    links: ["L2/insights/graph-algorithms-survey.md"],
  },
  {
    path: "L3/references/actr-memory-paper.md",
    title: "ACT-R Memory Paper",
    layer: 3,
    tags: ["memory", "paper"],
    links: ["L2/insights/personal-memory-systems.md"],
  },
  {
    path: "L3/references/bm25-reference.md",
    title: "BM25 Ranking Reference",
    layer: 3,
    tags: ["search", "ranking", "paper"],
  },
  ...securityArticles(),
  { path: "L4/index.md", title: "Action Index", layer: 4, tags: ["index"] },
  {
    path: "L4/tasks/implement-search-v2.md",
    title: "Implement Search V2",
    layer: 4,
    tags: ["search", "task"],
    links: [
      "L2/insights/spreading-activation-notes.md",
      "L2/insights/knowledge-graph-design.md",
    ],
    updated: "2026-07-01",
  },
  {
    path: "L4/tasks/review-security-articles.md",
    title: "Review Security Articles",
    layer: 4,
    tags: ["security", "task"],
    links: [
      "L3/clippings/security-article-00.md",
      "L3/clippings/security-article-01.md",
    ],
    updated: "2026-07-01",
  },
  {
    path: "L4/tasks/portfolio-rebalance.md",
    title: "Portfolio Rebalance Plan",
    layer: 4,
    tags: ["investment", "task"],
    links: ["L2/insights/investment-fomo-psychology.md"],
    updated: "2026-06-20",
  },
  {
    path: "L4/tasks/write-vault-guide.md",
    title: "Write Vault Guide",
    layer: 4,
    tags: ["knowledge", "task"],
    links: ["L2/insights/vault-organization.md"],
    updated: "2026-06-25",
  },
];

function toKnowledgeNode(doc) {
  const node = {
    id: doc.path,
    path: doc.path,
    title: doc.title,
    layer: doc.layer,
    tags: doc.tags,
    created: "2026-01-01",
    updated: doc.updated ?? "2026-03-01",
    mtime: FIXTURE_MTIME,
    accessed_count: 0,
  };
  if (doc.links) node.outboundLinks = doc.links;
  return node;
}

export function buildEvalGraph() {
  const nodes = FIXTURE_DOCS.map(toKnowledgeNode);
  const graph = buildGraph(nodes);

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

export const GOLDEN_QUERIES = [
  {
    id: "single-title-exact",
    seeds: ["Spreading Activation Notes"],
    relevance: {
      "L2/insights/spreading-activation-notes.md": 2,
      "L2/insights/graph-search-synthesis.md": 2,
      "L2/insights/knowledge-graph-design.md": 1,
      "L2/insights/graph-algorithms-survey.md": 1,
    },
  },
  {
    id: "phrase-knowledge-graph",
    seeds: ["knowledge graph"],
    relevance: {
      "L2/insights/knowledge-graph-design.md": 2,
      "L2/insights/graph-search-synthesis.md": 2,
      "L2/insights/spreading-activation-notes.md": 1,
      "L2/insights/personal-memory-systems.md": 1,
      "L2/insights/graph-algorithms-survey.md": 1,
    },
  },
  {
    id: "convergence-two-seeds",
    seeds: ["knowledge graph", "spreading activation"],
    relevance: {
      "L2/insights/graph-search-synthesis.md": 2,
      "L2/insights/knowledge-graph-design.md": 2,
      "L2/insights/spreading-activation-notes.md": 2,
      "L2/insights/ontology-modeling.md": 1,
      "L2/insights/graph-algorithms-survey.md": 1,
    },
  },
  {
    id: "hub-noise-review",
    seeds: ["review articles"],
    relevance: {
      "L4/tasks/review-security-articles.md": 2,
      "L3/clippings/security-article-00.md": 1,
      "L3/clippings/security-article-01.md": 1,
    },
  },
  {
    id: "hub-tag-security",
    seeds: ["security"],
    relevance: Object.fromEntries([
      ["L4/tasks/review-security-articles.md", 2],
      ...Array.from({ length: SECURITY_ARTICLE_COUNT }, (_, i) => [
        `L3/clippings/security-article-${String(i).padStart(2, "0")}.md`,
        1,
      ]),
    ]),
  },
  {
    id: "memory-association",
    seeds: ["memory"],
    relevance: {
      "L2/insights/personal-memory-systems.md": 2,
      "L3/references/actr-memory-paper.md": 2,
      "L2/insights/knowledge-graph-design.md": 1,
    },
  },
  {
    id: "typescript-topic",
    seeds: ["typescript"],
    relevance: {
      "L2/insights/typescript-monorepo-patterns.md": 2,
      "L2/insights/typescript-type-safety.md": 2,
    },
  },
  {
    id: "investment-single",
    seeds: ["investment"],
    relevance: {
      "L2/insights/investment-fomo-psychology.md": 2,
      "L4/tasks/portfolio-rebalance.md": 2,
    },
  },
  {
    id: "folder-browse",
    seeds: ["L2/insights"],
    relevance: {
      "L2/insights/knowledge-graph-design.md": 1,
      "L2/insights/spreading-activation-notes.md": 1,
      "L2/insights/graph-search-synthesis.md": 1,
      "L2/insights/ontology-modeling.md": 1,
      "L2/insights/graph-algorithms-survey.md": 1,
      "L2/insights/personal-memory-systems.md": 1,
      "L2/insights/investment-fomo-psychology.md": 1,
      "L2/insights/typescript-monorepo-patterns.md": 1,
      "L2/insights/typescript-type-safety.md": 1,
      "L2/insights/vault-organization.md": 1,
    },
  },
  {
    id: "task-context",
    seeds: ["implement search"],
    relevance: {
      "L4/tasks/implement-search-v2.md": 2,
      "L2/insights/spreading-activation-notes.md": 2,
      "L2/insights/knowledge-graph-design.md": 2,
      "L2/insights/graph-search-synthesis.md": 1,
    },
  },
  {
    id: "algorithm-tag",
    seeds: ["algorithm"],
    relevance: {
      "L2/insights/graph-algorithms-survey.md": 2,
      "L2/insights/spreading-activation-notes.md": 1,
      "L3/references/hipporag-paper.md": 1,
      "L2/insights/graph-search-synthesis.md": 1,
    },
  },
  {
    id: "l1-values",
    seeds: ["values"],
    relevance: {
      "L1/values.md": 2,
      "L1/identity.md": 1,
    },
  },
];
