/**
 * @file mcp.ts
 * @description MCP 도구 입출력 스키마 — CRUD 5개 + 검색 4개
 */
import type { Layer } from './common.js';
import type { KnowledgeNode } from './graph.js';
import type { ActivationResult } from './graph.js';

// ─── CRUD 도구 입력 스키마 ───────────────────────────────────────────

/** maencof_create 입력 */
export interface MaencofCreateInput {
  /** 문서 Layer (1-5) */
  layer: Layer;
  /** 태그 목록 (최소 1개) */
  tags: string[];
  /** 문서 내용 (마크다운) */
  content: string;
  /** 문서 제목 (선택) */
  title?: string;
  /** 파일명 힌트 (선택, 미지정 시 자동 생성) */
  filename?: string;
  /** 외부 출처 (Layer 3용) */
  source?: string;
  /** 만료일 YYYY-MM-DD (Layer 4용) */
  expires?: string;
}

/** maencof_read 입력 */
export interface MaencofReadInput {
  /** 문서 경로 (vault 상대 경로) */
  path: string;
  /** SA 홉 수 (관련 컨텍스트 깊이, 기본 2) */
  depth?: number;
  /** 관련 문서 포함 여부 (기본 true) */
  include_related?: boolean;
}

/** maencof_update 입력 */
export interface MaencofUpdateInput {
  /** 문서 경로 */
  path: string;
  /** 새 내용 (마크다운, 생략 시 기존 내용 유지) */
  content?: string;
  /** Frontmatter 부분 업데이트 (선택) */
  frontmatter?: Partial<{
    tags: string[];
    title: string;
    layer: Layer;
    confidence: number;
    schedule: string;
  }>;
}

/** maencof_delete 입력 */
export interface MaencofDeleteInput {
  /** 문서 경로 */
  path: string;
  /** backlink 경고 무시 여부 (기본 false) */
  force?: boolean;
}

/** maencof_move 입력 (Layer 간 전이) */
export interface MaencofMoveInput {
  /** 문서 경로 */
  path: string;
  /** 목표 Layer */
  target_layer: Layer;
  /** 전이 사유 */
  reason?: string;
  /** 신뢰도 (Layer 3→2 전이 시) */
  confidence?: number;
}

// ─── 검색 도구 입력 스키마 ─────────────────────────────────────────

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

// ─── 도구 출력 스키마 ─────────────────────────────────────────────

/** CRUD 공통 응답 */
export interface MaencofCrudResult {
  success: boolean;
  /** 처리된 문서 경로 */
  path: string;
  /** 결과 메시지 */
  message: string;
  /** 경고 목록 (backlink 경고 등) */
  warnings?: string[];
}

/** maencof_read 응답 */
export interface MaencofReadResult extends MaencofCrudResult {
  /** 문서 내용 */
  content: string;
  /** 문서 노드 정보 */
  node: KnowledgeNode;
  /** 관련 문서 (SA 결과) */
  related?: ActivationResult[];
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
  /** 형제 노드 목록 */
  siblings: KnowledgeNode[];
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
}

// ─── CLAUDE.md 조작 도구 ─────────────────────────────────────────

/** claudemd_merge 입력 */
export interface ClaudeMdMergeInput {
  /** 삽입할 maencof 섹션 내용 (마커 제외) */
  content: string;
  /** 드라이런 모드 (기본 false) */
  dry_run?: boolean;
}

/** claudemd_merge 출력 */
export interface ClaudeMdMergeResult {
  /** 파일 변경 여부 */
  changed: boolean;
  /** 기존 섹션 존재 여부 */
  had_existing_section: boolean;
  /** 백업 파일 경로 */
  backup_path?: string;
  /** 최종 maencof 섹션 내용 */
  section_content: string;
}

/** claudemd_read 입력 (파라미터 없음) */
export type ClaudeMdReadInput = Record<string, never>;

/** claudemd_read 출력 */
export interface ClaudeMdReadResult {
  /** maencof 섹션 존재 여부 */
  exists: boolean;
  /** 섹션 내용 (없으면 null) */
  content: string | null;
  /** CLAUDE.md 파일 존재 여부 */
  file_exists: boolean;
}

/** claudemd_remove 입력 */
export interface ClaudeMdRemoveInput {
  /** 드라이런 모드 (기본 false) */
  dry_run?: boolean;
}

/** claudemd_remove 출력 */
export interface ClaudeMdRemoveResult {
  /** 제거 성공 여부 */
  removed: boolean;
  /** 백업 파일 경로 */
  backup_path?: string;
}

// ─── 지식 연결 추천 도구 ─────────────────────────────────────────

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
