/**
 * @file contextGoldenSet.ts
 * @description kg_context 파이프라인 골든 쿼리셋 — 자연어 원문 query 에 대한 graded relevance.
 *
 * goldenSet.ts(정제 seed 배열, kg_search 경로)와 달리 실소비 주경로인 kg_context 의
 * 입력 형태(자연어 문자열 → 내부 분해)를 그대로 측정한다. 유형: 동형이의어 판별 2,
 * 문법어 혼입 자연어 1, recall 보호 3. 케이스 추가 시 contextBaseline.json 을
 * 같은 커밋에서 재기록한다 (ratchet 규칙 3).
 */

/** 컨텍스트 골든 쿼리 항목 */
export interface ContextGoldenQuery {
  id: string;
  /** kg_context 의 query 인자 (자연어 원문) */
  query: string;
  /** path → 등급(1|2). 미기재 경로는 0. */
  relevance: Record<string, 1 | 2>;
}

export const CONTEXT_GOLDEN_QUERIES: ContextGoldenQuery[] = [
  // 동형이의어: "image" — 도커 도메인 질의에 그래픽 클러스터가 유입되면 안 된다.
  {
    id: 'ctx-homograph-docker-image',
    query: 'docker image optimization',
    relevance: {
      'L2/insights/docker-image-optimization.md': 2,
      'L4/tasks/container-registry-setup.md': 1,
    },
  },
  // 동형이의어: "전환" — 비ASCII 토큰이 IDF·phrase 경로를 동일하게 통과하는지 검증.
  {
    id: 'ctx-homograph-korean',
    query: 'n3r 전환 계획',
    relevance: {
      'L2/insights/n3r-migration-plan.md': 2,
    },
  },
  // 문법어 혼입 자연어 — df=0 토큰(how/to/layers)은 후보를 만들지 않고 무해해야 한다.
  {
    id: 'ctx-natural-stopwords',
    query: 'how to optimize docker image layers',
    relevance: {
      'L2/insights/docker-image-optimization.md': 2,
      'L4/tasks/container-registry-setup.md': 1,
    },
  },
  // phrase 수렴 — 희귀 anchor 토큰이 없는(둘 다 흔한 토큰) 쿼리에서 인접 2-gram 이
  // 수렴 문서를 phrase 보너스로 승격시키는지 (deriveContextSeeds 회귀 감시).
  {
    id: 'ctx-phrase-convergence',
    query: 'graph search',
    relevance: {
      'L2/insights/graph-search-synthesis.md': 2,
      'L2/insights/spreading-activation-notes.md': 1,
      'L2/insights/knowledge-graph-design.md': 1,
      'L2/insights/graph-algorithms-survey.md': 1,
      'L4/tasks/implement-search-v2.md': 1,
    },
  },
  // recall 보호 — 분해·IDF 변경이 기존 다문서 회수(context 의 분산 지향)를 훼손하지 않는지.
  {
    id: 'ctx-recall-knowledge-graph',
    query: 'knowledge graph design',
    relevance: {
      'L2/insights/knowledge-graph-design.md': 2,
      'L2/insights/graph-search-synthesis.md': 2,
      'L2/insights/spreading-activation-notes.md': 2,
      'L2/insights/ontology-modeling.md': 1,
    },
  },
  {
    id: 'ctx-recall-security-review',
    query: 'review security articles',
    relevance: {
      'L4/tasks/review-security-articles.md': 2,
      'L3/clippings/security-article-00.md': 1,
      'L3/clippings/security-article-01.md': 1,
    },
  },
  {
    id: 'ctx-recall-memory',
    query: 'personal memory systems',
    relevance: {
      'L2/insights/personal-memory-systems.md': 2,
      'L3/references/actr-memory-paper.md': 2,
      'L2/insights/knowledge-graph-design.md': 1,
    },
  },
];
