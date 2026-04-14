/**
 * @file mcp-kg.ts
 * @description Knowledge Graph 도구 입출력 스키마 — kg_search, kg_navigate, kg_context, kg_status, kg_suggest_links
 */
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
}

/** kg_context 입력 */
export interface KgContextInput {
  /** 검색 쿼리 */
  query: string;
  /** 토큰 예산 (기본 2000) */
  token_budget?: number;
  /** 상위 N개 전문 포함 (기본 false) */
  include_full?: boolean;
}

/** kg_status 입력 (파라미터 없음) */
export type KgStatusInput = Record<string, never>;

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
  /** 형제 노드 목록 */
  siblings: KnowledgeNode[];
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
