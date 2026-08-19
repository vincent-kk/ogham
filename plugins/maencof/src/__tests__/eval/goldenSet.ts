/**
 * @file goldenSet.ts
 * @description 검색 품질 골든 쿼리셋 — fixtureVault 위상에 대한 (시드, graded relevance) 판정.
 *
 * 등급: 2=핵심, 1=관련, 0(생략)=무관. 판정 근거는 픽스처의 링크/주제 구조
 * (.metadata/maencof/TOOL/Query-Gated-Accumulative-Spreading-Activation/03장 쿼리 유형 계층).
 * 케이스 추가 시 baseline.json을 같은 커밋에서 재기록한다 (ratchet 규칙 3).
 * id prefix 규약: `archived-working-*` 는 활성 문서가 정답(스텁은 노이즈),
 * `archived-archival-*` 는 스텁이 정답 — archivedSweep 러너가 이 prefix 로 클래스를 나눈다.
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
      'L3/structural/graph-search-hub.md': 1,
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
      'L3/structural/graph-search-hub.md': 1,
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
      'L3/structural/graph-search-hub.md': 1,
    },
  },
  {
    id: 'hub-noise-review',
    seeds: ['review articles'],
    relevance: {
      'L4/tasks/review-security-articles.md': 2,
      'L3/structural/security-review-hub.md': 2,
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
      'L5/buf-portfolio-note.md': 1,
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
      'L2/insights/docker-image-optimization.md': 1,
      'L2/insights/image-rendering-pipeline.md': 1,
      'L2/insights/image-editing-workflow.md': 1,
      'L2/insights/n3r-migration-plan.md': 1,
      'L2/insights/ui-transition-patterns.md': 1,
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
      'L3/structural/graph-search-hub.md': 1,
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
  {
    id: 'indirect-hipporag',
    seeds: ['hipporag'],
    relevance: {
      'L3/references/hipporag-paper.md': 2,
      'L2/insights/graph-algorithms-survey.md': 2,
      'L2/insights/spreading-activation-notes.md': 1,
    },
  },
  {
    id: 'deep-chain-actr',
    seeds: ['ACT-R'],
    relevance: {
      'L3/references/actr-memory-paper.md': 2,
      'L2/insights/personal-memory-systems.md': 2,
      'L2/insights/knowledge-graph-design.md': 1,
    },
  },
  {
    id: 'convergence-single-seed',
    seeds: ['knowledge graph design'],
    relevance: {
      'L2/insights/knowledge-graph-design.md': 2,
      'L2/insights/graph-search-synthesis.md': 2,
      'L2/insights/spreading-activation-notes.md': 2,
      'L2/insights/ontology-modeling.md': 1,
      'L3/structural/graph-search-hub.md': 1,
    },
  },
  {
    id: 'hub-suppress-security-task',
    seeds: ['security task'],
    relevance: {
      'L4/tasks/review-security-articles.md': 2,
      'L3/clippings/security-article-00.md': 1,
      'L3/clippings/security-article-01.md': 1,
    },
  },
  {
    id: 'precision-typescript-monorepo',
    seeds: ['typescript monorepo'],
    relevance: {
      'L2/insights/typescript-monorepo-patterns.md': 2,
      'L2/insights/typescript-type-safety.md': 2,
    },
  },
  // 동형이의어 OR 시드 — kg_context 자연어 분해가 만드는 것과 동일한 시드 형태.
  // 흔한 토큰("image"/"전환")이 무관 도메인 클러스터를 시드하는 노이즈를 IDF가 강등하는지 판별.
  {
    id: 'homograph-or-image',
    seeds: ['docker', 'image'],
    relevance: {
      'L2/insights/docker-image-optimization.md': 2,
      'L4/tasks/container-registry-setup.md': 1,
    },
  },
  {
    id: 'homograph-or-korean',
    seeds: ['n3r', '전환'],
    relevance: {
      'L2/insights/n3r-migration-plan.md': 2,
    },
  },
  // ─── 허브 브릿지 (hub 감쇠 인자 · CROSS_LAYER 멀티플라이어 측정) ────────
  // bm25-reference 는 LINK 가 하나도 없는 고립 노드다. 허브가 유일한 탈출로이므로,
  // 이 쿼리에서 그래프 클러스터가 올라오는지가 브릿지가 실제로 작동하는지를 판별한다.
  {
    id: 'hub-bridge-from-orphan',
    seeds: ['BM25'],
    relevance: {
      'L3/references/bm25-reference.md': 2,
      'L3/structural/graph-search-hub.md': 2,
      'L2/insights/graph-search-synthesis.md': 1,
      'L2/insights/spreading-activation-notes.md': 1,
      'L4/tasks/implement-search-v2.md': 1,
    },
  },
  // 허브를 직접 시드했을 때 브릿지 대상이 레이어를 가로질러 올라오는지.
  // 미분류 조각(L5)은 허브가 잇는 대상이긴 하나 실제 자료보다 아래여야 한다.
  {
    id: 'hub-cross-layer-span',
    seeds: ['graph search hub'],
    relevance: {
      'L3/structural/graph-search-hub.md': 2,
      'L2/insights/graph-search-synthesis.md': 2,
      'L2/insights/spreading-activation-notes.md': 2,
      'L2/insights/knowledge-graph-design.md': 1,
      'L2/insights/graph-algorithms-survey.md': 1,
      'L3/references/hipporag-paper.md': 1,
      'L3/references/bm25-reference.md': 1,
      'L4/tasks/implement-search-v2.md': 1,
    },
  },
  {
    id: 'hub-project-moc',
    seeds: ['security review hub'],
    relevance: {
      'L3/structural/security-review-hub.md': 2,
      'L4/tasks/review-security-articles.md': 2,
      'L3/clippings/security-article-00.md': 1,
      'L3/clippings/security-article-01.md': 1,
    },
  },
  // ─── L5 격리 (L5 감쇠 인자 측정) ───────────────────────────────────────
  // ontology 조각이 활성을 받은 뒤 그 활성이 무관한 형제 버퍼(graph/portfolio/quote)로
  // 새어나가면, 실제 L2 지식이 그 아래로 밀린다. L5 감쇠 인자의 직접 측정 지점이다.
  {
    id: 'l5-isolation-ontology',
    seeds: ['ontology'],
    relevance: {
      'L2/insights/ontology-modeling.md': 2,
      'L5/buf-ontology-fragment.md': 1,
      'L2/insights/knowledge-graph-design.md': 1,
    },
  },
  // 반대 방향 보호: 버퍼를 명시적으로 찾을 때는 여전히 찾을 수 있어야 한다.
  // 격리가 지나쳐 L5 가 검색에서 사라지면 이 쿼리가 먼저 무너진다.
  {
    id: 'l5-inbox-reachable',
    seeds: ['snippet'],
    relevance: {
      'L5/buf-graph-snippet.md': 1,
      'L5/buf-ontology-fragment.md': 1,
      'L5/buf-portfolio-note.md': 1,
      'L5/buf-unsorted-quote.md': 1,
    },
  },
  // ─── compound seed (C안: 원형 우선 + 분해 OR 폴백) ─────────────────────
  // 태그에 verbatim 으로 존재하는 kebab seed — 원형 우선 경로의 직접 측정 지점.
  {
    id: 'kebab-tag-verbatim',
    seeds: ['weekly-report'],
    relevance: {
      'L4/routines/weekly-report-routine.md': 2,
      'L4/routines/weekly-report-checklist.md': 2,
    },
  },
  // 원형도 없고 분해 AND 도 공집합인 compound seed — OR 폴백 경로의 측정 지점.
  // routine/checklist 는 서로 다른 문서에만 있어 AND 는 반드시 비고,
  // OR 가 두 문서를 저득점으로 회수한다.
  {
    id: 'compound-fallback-or',
    seeds: ['routine-checklist'],
    relevance: {
      'L4/routines/weekly-report-routine.md': 2,
      'L4/routines/weekly-report-checklist.md': 2,
    },
  },
  // compound-or 가 다른 티어와 경쟁하는 골든 — compoundOrScore 스윕 축의 관측점.
  // 'routine-checklist' 는 OR 폴백(compoundOrScore)으로 핵심 문서 2건을,
  // 'archiv' 는 tag-prefix(0.3)로 관련 문서 1건을 시드한다. 두 시드의 IDF 가
  // 같아(df 각 1) 0.3 경계에서 순위가 갈리고, 축 값이 지표에 나타난다.
  // 그레이딩 판단: 명시 개념의 부분 회수(grade 2)가 접두 우연 매칭(grade 1)보다
  // 진하다 — compound-or 를 tag-prefix 아래로 두지 않는 근거.
  {
    id: 'compound-or-vs-prefix-tier',
    seeds: ['routine-checklist', 'archiv'],
    relevance: {
      'L4/routines/weekly-report-routine.md': 2,
      'L4/routines/weekly-report-checklist.md': 2,
      'L4/routines/report-archive.md': 1,
    },
  },
  // 클러스터 커버리지 골든 (R4·R7) — 같은 cluster_key 스레드 8건 + 증류본이
  // 대표 1건으로 접혀야 결정·인접 문서가 top-k 에 남는다. 접힌 멤버(update-01..08)는
  // 등급 0 이므로 collapse 실패 시 도배로 nDCG 가 무너진다 — 골든 자체가 collapse 를
  // 측정한다. 'gcc-3903' 시드는 스레드 전원 + 증류본 + 결정을 태그로 활성화한다.
  {
    id: 'cluster-collapse-coverage',
    seeds: ['gcc-3903'],
    relevance: {
      'L2/decisions/gcc-3903-retry-decision.md': 2,
      'L4/works/gcc-3903-digest.md': 2,
      'L2/decisions/billing-retry-policy.md': 1,
    },
  },
  // 전역 대표 승계 골든 (R4) — 'jira' 시드는 update-01..08 만 활성화하고 증류본
  // (태그 gcc-3903 뿐)은 활성화하지 않는다. 요청서 계약(대표 = 클러스터 내 updated
  // 최신)이 지켜지면 비활성 증류본이 대표로 승계된다. 승계 실패 시 update-08
  // (등급 0)이 1위가 되어 nDCG 0.
  {
    id: 'cluster-digest-succession',
    seeds: ['jira'],
    relevance: {
      'L4/works/gcc-3903-digest.md': 2,
    },
  },
  // archived 침강 골든 — working: 스텁 6건(등급 0)이 같은 태그로 경쟁하므로 침강
  // 실패(계수 상승) 시 스텁 도배로 nDCG 가 무너진다. archival: 스텁만 가진 태그의
  // 회수 — 계수 0이면 시드 소멸로 recall 0 이 드러난다(축 하한 관측점).
  {
    id: 'archived-working-cve-watch',
    seeds: ['cve-watch'],
    relevance: {
      'L2/insights/cve-triage-playbook.md': 2,
      'L4/advisories/cve-watch-active-01.md': 2,
      'L4/advisories/cve-watch-active-02.md': 1,
      'L4/advisories/cve-watch-active-03.md': 1,
    },
  },
  {
    id: 'archived-working-advisory',
    seeds: ['advisory'],
    relevance: {
      'L4/advisories/cve-watch-active-01.md': 2,
      'L4/advisories/cve-watch-active-02.md': 2,
      'L4/advisories/cve-watch-active-03.md': 2,
    },
  },
  {
    id: 'archived-archival-retro',
    seeds: ['retro-incident'],
    relevance: {
      'L4/advisories/retro-incident-01.md': 2,
      'L4/advisories/retro-incident-02.md': 2,
    },
  },
];
