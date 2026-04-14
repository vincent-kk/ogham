/**
 * @file mcp-crud.ts
 * @description CRUD 도구 입출력 스키마 — create, read, update, delete, move
 */
import type { Layer, SubLayer } from './common.js';
import type { ActivationResult, KnowledgeNode } from './graph.js';
import type { L1ChangeReason } from './l1-amendment.js';

/** `create` 입력 */
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
  /** 서브레이어 (L3: relational/structural/topical, L5: buffer/boundary) */
  sub_layer?: SubLayer;
  /** 문서 콘텐츠에서 언급된 인물 목록 (선택, 모든 레이어) */
  mentioned_persons?: string[];
}

/** `read` 입력 */
export interface MaencofReadInput {
  /** 문서 경로 (vault 상대 경로) */
  path: string;
  /** SA 홉 수 (관련 컨텍스트 깊이, 기본 2) */
  depth?: number;
  /** 관련 문서 포함 여부 (기본 true) */
  include_related?: boolean;
}

/** `update` 입력 */
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
    sub_layer: SubLayer;
  }>;
  /** L1 수정 사유 대분류 (L1 경로일 때 필수) */
  change_reason?: L1ChangeReason;
  /** L1 수정 근거 서술 (L1 경로일 때 필수, 최소 20자) */
  justification?: string;
  /** L1 수정 확인 (L1 경로일 때 필수, true) */
  confirm_l1?: boolean;
}

/** `delete` 입력 */
export interface MaencofDeleteInput {
  /** 문서 경로 */
  path: string;
  /** backlink 경고 무시 여부 (기본 false) */
  force?: boolean;
}

/** `move` 입력 (Layer 간 전이) */
export interface MaencofMoveInput {
  /** 문서 경로 */
  path: string;
  /** 목표 Layer */
  target_layer: Layer;
  /** 전이 사유 */
  reason?: string;
  /** 신뢰도 (Layer 3→2 전이 시) */
  confidence?: number;
  /** 목표 서브레이어 */
  target_sub_layer?: SubLayer;
}

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

/** read 응답 */
export interface MaencofReadResult extends MaencofCrudResult {
  /** 문서 내용 */
  content: string;
  /** 문서 노드 정보 */
  node: KnowledgeNode;
  /** 관련 문서 (SA 결과) */
  related?: ActivationResult[];
}
