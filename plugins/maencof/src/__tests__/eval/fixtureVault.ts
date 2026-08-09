/**
 * @file fixtureVault.ts
 * @description 검색 품질 평가용 결정적 합성 vault — tirnanog 실측 위상 특성 축소 재현.
 *
 * 재현 특성: LINK 고아율 ≥ 50%, 대형 폴더 SIBLING 클리크(20노드), 허브 태그(security),
 * 다경로 수렴 구조(두 시드 → graph-search-synthesis), 어휘 비중첩 연상 경로(ontology-modeling),
 * 동형이의어 위상(공유 토큰 "image"·"전환"이 무관 도메인 클러스터에 걸침 — IDF 판별 사례),
 * 레이어 직교 허브 2종(CROSS_LAYER 브릿지), 평면 L5 임시 수용소(활성 누출 경로).
 * 뒤의 두 특성은 감쇠 인자 스윕이 측정할 대상을 만든다 — 이들이 없으면 hub·L5·CROSS_LAYER
 * 계수는 골든셋에서 발화하지 않고, 값을 바꿔도 지표가 움직이지 않는다.
 * 랜덤 요소 없음 — 실행 간 완전 동일 그래프를 보장한다.
 */
import {
  buildGraph,
  hydrateRuntimeMaps,
} from '../../core/graphBuilder/index.js';
import { calculateWeights } from '../../core/weightCalculator/index.js';
import { Layer, toNodeId } from '../../types/common.js';
import type { HubKind } from '../../types/common.js';
import type { KnowledgeGraph, KnowledgeNode } from '../../types/graph.js';

/** 픽스처 문서 정의 (id는 vault-root 상대 경로) */
interface FixtureDoc {
  path: string;
  title: string;
  layer: Layer;
  tags: string[];
  links?: string[];
  updated?: string;
  /** 교차 연결 허브 — CROSS_LAYER 엣지의 출발점이 된다 */
  hub?: boolean;
  hubKind?: HubKind;
  purpose?: string;
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
  // 동형이의어 클러스터 A — "image": 컨테이너(도커) 도메인 vs 그래픽 도메인.
  // 그래픽 클러스터는 링크로 상호 강화(실측 dense-cluster 노이즈 재현), df("image")=6 ≫ df("docker")=2.
  {
    path: 'L2/insights/docker-image-optimization.md',
    title: 'Docker Image Optimization',
    layer: Layer.L2_DERIVED,
    tags: ['docker', 'devops'],
  },
  {
    path: 'L2/insights/image-rendering-pipeline.md',
    title: 'Image Rendering Pipeline',
    layer: Layer.L2_DERIVED,
    tags: ['graphics', 'media'],
  },
  {
    path: 'L2/insights/image-editing-workflow.md',
    title: 'Image Editing Workflow',
    layer: Layer.L2_DERIVED,
    tags: ['graphics', 'media'],
    links: ['L2/insights/image-rendering-pipeline.md'],
  },
  // 동형이의어 클러스터 B — "전환": 마이그레이션(n3r) 도메인 vs UI/재무 도메인.
  // df("전환")=4 ≫ df("n3r")=1 — 비ASCII 토큰의 IDF 경로 검증을 겸한다.
  {
    path: 'L2/insights/n3r-migration-plan.md',
    title: 'N3R 전환 계획',
    layer: Layer.L2_DERIVED,
    tags: ['n3r', 'migration'],
  },
  {
    path: 'L2/insights/ui-transition-patterns.md',
    title: '화면 전환 패턴',
    layer: Layer.L2_DERIVED,
    tags: ['frontend', 'ui'],
    links: ['L3/clippings/screen-transition-animation.md'],
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
  {
    path: 'L3/clippings/image-compression-survey.md',
    title: 'Image Compression Survey',
    layer: Layer.L3_EXTERNAL,
    tags: ['graphics', 'media'],
    links: ['L2/insights/image-rendering-pipeline.md'],
  },
  {
    path: 'L3/clippings/responsive-image-loading.md',
    title: 'Responsive Image Loading',
    layer: Layer.L3_EXTERNAL,
    tags: ['graphics', 'media'],
    links: ['L3/clippings/image-compression-survey.md'],
  },
  {
    path: 'L3/clippings/image-formats-reference.md',
    title: 'Image Formats Reference',
    layer: Layer.L3_EXTERNAL,
    tags: ['graphics', 'media'],
    links: ['L3/clippings/image-compression-survey.md'],
  },
  {
    path: 'L3/clippings/screen-transition-animation.md',
    title: '화면 전환 애니메이션',
    layer: Layer.L3_EXTERNAL,
    tags: ['frontend', 'animation'],
  },
  {
    path: 'L3/clippings/currency-conversion-note.md',
    title: '환율 전환 메모',
    layer: Layer.L3_EXTERNAL,
    tags: ['finance'],
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
  // kebab 태그 verbatim 회귀(B3): 태그는 통짜 term, 한국어 제목이라 분해 AND 로는
  // 절대 잡히지 않는다 — 원형 우선 경로만이 이 두 문서를 살린다. 전용 폴더에 두는
  // 이유: 기존 L4/tasks 에 섞으면 SIBLING 엣지가 기존 골든 쿼리의 위상을 바꾼다.
  {
    path: 'L4/routines/weekly-report-routine.md',
    title: '주간보고 루틴',
    layer: Layer.L4_ACTION,
    tags: ['weekly-report', 'routine'],
    updated: '2026-02-01',
  },
  {
    path: 'L4/routines/weekly-report-checklist.md',
    title: '주간보고 체크리스트',
    layer: Layer.L4_ACTION,
    tags: ['weekly-report', 'checklist'],
    updated: '2026-02-02',
  },
  // compound-or 스윕의 경쟁 상대: 'archiv' 시드가 tag-prefix(0.3) 티어로 이 문서를
  // 시드해, OR 폴백 회수분(compoundOrScore)과 0.3 경계에서 순위를 다투게 한다.
  {
    path: 'L4/routines/report-archive.md',
    title: '보고 아카이브',
    layer: Layer.L4_ACTION,
    tags: ['report-archive', 'archive'],
    updated: '2026-02-03',
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
    path: 'L4/tasks/container-registry-setup.md',
    title: 'Container Registry Setup',
    layer: Layer.L4_ACTION,
    tags: ['docker', 'devops', 'task'],
    links: ['L2/insights/docker-image-optimization.md'],
    updated: '2026-06-28',
  },
  {
    path: 'L4/tasks/write-vault-guide.md',
    title: 'Write Vault Guide',
    layer: Layer.L4_ACTION,
    tags: ['knowledge', 'task'],
    links: ['L2/insights/vault-organization.md'],
    updated: '2026-06-25',
  },
  // ─── 허브 (레이어 직교) ────────────────────────────────────────────────
  // CROSS_LAYER 는 태그 겹침으로만 대상을 정하므로, 두 허브는 각자 다른 성격의
  // 브릿지를 만든다: 좁고 깊은 다리(graph/search, 4개 레이어 횡단)와
  // 넓고 얕은 다리(security, 20+ 노드 fan-out).
  {
    path: 'L3/structural/graph-search-hub.md',
    title: 'Graph Search Hub',
    layer: Layer.L3_EXTERNAL,
    tags: ['graph', 'search'],
    hub: true,
    hubKind: 'study_hub',
    purpose: '그래프 검색 학습 경로 통합',
  },
  {
    path: 'L3/structural/security-review-hub.md',
    title: 'Security Review Hub',
    layer: Layer.L3_EXTERNAL,
    tags: ['security'],
    hub: true,
    hubKind: 'project_moc',
    purpose: '보안 리뷰 대상 자료 통합',
  },
  // ─── L5 임시 수용소 (평면) ─────────────────────────────────────────────
  // 전부 `snippet` 태그를 공유해 한 폴더의 SIBLING 클리크를 이룬다. 실제 클러스터와
  // 태그가 겹치는 항목(graph/ontology/investment)이 활성을 받았을 때, 그 활성이
  // 무관한 형제 버퍼로 새어나가는지가 L5 감쇠 인자의 측정 지점이다.
  {
    path: 'L5/buf-graph-snippet.md',
    title: 'Graph Snippet Fragment',
    layer: Layer.L5_CONTEXT,
    tags: ['graph', 'snippet'],
  },
  {
    path: 'L5/buf-ontology-fragment.md',
    title: 'Ontology Fragment',
    layer: Layer.L5_CONTEXT,
    tags: ['ontology', 'snippet'],
  },
  {
    path: 'L5/buf-portfolio-note.md',
    title: 'Portfolio Scratch Note',
    layer: Layer.L5_CONTEXT,
    tags: ['investment', 'snippet'],
  },
  {
    path: 'L5/buf-unsorted-quote.md',
    title: 'Unsorted Quote',
    layer: Layer.L5_CONTEXT,
    tags: ['snippet'],
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
  if (doc.hub) {
    node.hub = true;
    node.hubKind = doc.hubKind;
    node.purpose = doc.purpose;
  }
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
