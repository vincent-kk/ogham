/**
 * @file mcpKg.ts
 * @description Knowledge Graph 도구 입출력 스키마 — kg_search, kg_navigate, kg_context, kg_status, kg_suggest_links, kg_timeline
 */
import type { KgContextScope } from '../constants/kgContext.js';

import type { Layer, SubLayer } from './common.js';
import type { ActivationResult, KnowledgeNode } from './graph.js';

/** kg_search 입력 */
export interface KgSearchInput {
  /** 시드 노드 (경로 또는 키워드) */
  seed: string[];
  /** 최대 반환 수 (기본 10) */
  max_results?: number;
  /** 감쇠 인자 (기본 0.7) */
  decay?: number;
  /** 발화 임계값 (기본 0.1) */
  threshold?: number;
  /** 최대 홉 수 (기본 5) */
  max_hops?: number;
  /** updated 시간창 하한 (YYYY-MM-DD, inclusive; 단독 = updated_after) */
  since?: string;
  /** updated 시간창 상한 (YYYY-MM-DD, inclusive) */
  until?: string;
  /** Layer 필터 */
  layer_filter?: Layer[];
  /** 서브레이어 필터 */
  sub_layer?: SubLayer;
}

/** kg_navigate 입력 */
export interface KgNavigateInput {
  /** 대상 노드 경로 */
  path: string;
  /** 인바운드 링크 포함 (기본 true) */
  include_inbound?: boolean;
  /** 아웃바운드 링크 포함 (기본 true) */
  include_outbound?: boolean;
  /** 부모/자식 포함 (기본 true) */
  include_hierarchy?: boolean;
  /** 형제 목록 상한(MAX_NAVIGATE_SIBLINGS) 해제 — 대형 폴더 전체 열람용 (기본 false) */
  include_all_siblings?: boolean;
}

/** kg_context 입력 */
export interface KgContextInput {
  /** 검색 쿼리 */
  query: string;
  /** 토큰 예산 (기본 2000) */
  token_budget?: number;
  /** 상위 N개 전문 포함 (기본 false) */
  include_full?: boolean;
  /** updated 시간창 하한 (YYYY-MM-DD, inclusive; 단독 = updated_after) */
  since?: string;
  /** updated 시간창 상한 (YYYY-MM-DD, inclusive) */
  until?: string;
  /** Layer 필터 (예산 소비 전 pre-filter) */
  layer_filter?: Layer[];
  /** 서브레이어 필터 (예산 소비 전 pre-filter) */
  sub_layer?: SubLayer;
  /** 탐색 폭 (기본 'balanced' — 미지정 시 기존 동작과 동일) */
  scope?: KgContextScope;
}

/** kg_status 입력 */
export interface KgStatusInput {
  /** LINK 고립 노드 경로 목록 포함 여부 (기본 false; MAX_LINK_ORPHAN_PATHS 상한) */
  include_orphan_paths?: boolean;
}

/** kg_search 응답 */
export interface KgSearchResult {
  /** 검색 결과 목록 (점수 내림차순) */
  results: ActivationResult[];
  /** 검색 소요 시간 (ms) */
  durationMs: number;
  /** 탐색된 총 노드 수 */
  exploredNodes: number;
}

/** kg_navigate 응답 */
export interface KgNavigateResult {
  /** 현재 노드 */
  node: KnowledgeNode;
  /** 인바운드 링크 */
  inbound: KnowledgeNode[];
  /** 아웃바운드 링크 */
  outbound: KnowledgeNode[];
  /** 부모 노드 */
  parent?: KnowledgeNode;
  /** 자식 노드 목록 */
  children: KnowledgeNode[];
  /** 형제 노드 목록 — 동일 디렉토리 멤버십에서 파생 (경로 정렬, 기본 MAX_NAVIGATE_SIBLINGS 상한 — include_all_siblings 로 해제) */
  siblings: KnowledgeNode[];
  /** 상한 적용 전 형제 총수 — siblings.length 보다 크면 목록이 절단된 것 */
  siblingTotalCount?: number;
  /** CROSS_LAYER 연결 노드 (L5-Boundary 경유) */
  crossLayer?: KnowledgeNode[];
  /** DOMAIN 연결 노드 (동일 domain 태그) */
  domain?: KnowledgeNode[];
}

/** kg_context 응답 */
export interface KgContextResult {
  /** 컨텍스트 블록 (마크다운) */
  context: string;
  /** 포함된 문서 수 */
  documentCount: number;
  /** 사용된 토큰 추정치 */
  estimatedTokens: number;
  /** 토큰 예산 초과로 제거된 문서 수 */
  truncatedCount: number;
}

/** kg_status 응답 */
export interface KgStatusResult {
  /** 총 노드 수 */
  nodeCount: number;
  /** 총 엣지 수 */
  edgeCount: number;
  /** 인덱스 마지막 빌드 시간 */
  lastBuiltAt?: string;
  /** Stale 노드 수 */
  staleNodeCount: number;
  /** 인덱스 신선도 (%) */
  freshnessPercent: number;
  /** 전체 재빌드 권장 여부 */
  rebuildRecommended: boolean;
  /** vault 경로 */
  vaultPath: string;
  /** 서브레이어별 노드 분포 */
  subLayerDistribution?: Record<string, number>;
  /**
   * LINK(위키링크) 서브그래프 완전 고립 노드 수 — inbound·outbound LINK 모두 없음.
   * total-degree orphan(폴더-형제 엣지 포함)이 마스킹하는 의미적 고립을 드러낸다.
   */
  linkOrphanCount?: number;
  /** inbound LINK 가 없는 노드 수 (어디서도 참조되지 않음). */
  linkInboundOrphanCount?: number;
  /** outbound LINK 가 없는 노드 수 (어떤 문서도 가리키지 않음). */
  linkOutboundOrphanCount?: number;
  /**
   * LINK 고립 노드의 Layer별 분포 (키: '1'~'5').
   * L1 고립(정체성 핵심의 그래프 단절)과 L3/L4 raw 클리핑 고립(정상 상태)을
   * 구분하는 provenance 신호 — 합은 linkOrphanCount.
   */
  linkOrphanByLayer?: Record<string, number>;
  /** LINK 고립 노드 중 아카이브 스텁(frontmatter archived: true) 수 — 링크 부재가 기대 상태인 부분집합. */
  linkOrphanArchivedCount?: number;
  /** LINK 고립 노드 경로 목록 (정렬, MAX_LINK_ORPHAN_PATHS 상한) — include_orphan_paths=true 일 때만. */
  linkOrphanPaths?: string[];
}

/** kg_suggest_links 입력 */
export interface KgSuggestLinksInput {
  /** 대상 문서 경로 (vault 상대 경로). 기존 문서일 때 사용 */
  path?: string;
  /** 새 문서의 태그 (아직 생성되지 않은 문서의 연결 추천 시) */
  tags?: string[];
  /** 새 문서의 내용 일부 (키워드 추출용) */
  content_hint?: string;
  /** 최대 추천 수 (기본 5) */
  max_suggestions?: number;
  /** 최소 유사도 임계값 (기본 0.2) */
  min_score?: number;
}

/** 연결 추천 항목 */
export interface LinkSuggestion {
  /** 추천 대상 문서 경로 */
  target_path: string;
  /** 추천 대상 문서 제목 */
  target_title: string;
  /** 추천 대상 문서 Layer */
  target_layer: number;
  /** 추천 대상 문서 태그 */
  target_tags: string[];
  /** 종합 유사도 점수 (0.0 ~ 1.0) */
  score: number;
  /** 연결 근거 (LLM이 판단할 수 있도록) */
  reason: string;
  /** 점수 구성: 태그 유사도 기여분 */
  tag_score: number;
  /** 점수 구성: SA 보강 점수 */
  sa_score: number;
}

/** kg_suggest_links 출력 */
export interface KgSuggestLinksResult {
  /** 추천 목록 (점수 내림차순) */
  suggestions: LinkSuggestion[];
  /** 탐색된 총 후보 수 */
  candidates_explored: number;
  /** 소요 시간 (ms) */
  duration_ms: number;
}

/** kg_timeline 입력 */
export interface KgTimelineInput {
  /** 최대 반환 수 (기본 20) */
  limit?: number;
  /** updated 시간창 하한 (YYYY-MM-DD, inclusive; 단독 = updated_after) */
  since?: string;
  /** updated 시간창 상한 (YYYY-MM-DD, inclusive) */
  until?: string;
  /** Layer 필터 */
  layer_filter?: Layer[];
  /** 서브레이어 필터 */
  sub_layer?: SubLayer;
}

/** kg_timeline 결과 항목 */
export interface KgTimelineItem {
  path: string;
  title: string;
  updated: string;
  created: string;
  layer: Layer;
  gist?: string;
}

/** kg_timeline 출력 */
export interface KgTimelineResult {
  /** updated 내림차순 정렬된 결과 (limit 적용) */
  results: KgTimelineItem[];
  /** 시간창/필터 적용 후 매칭된 총 문서 수 (limit 적용 전) */
  totalMatched: number;
}
