/**
 * @file mcpCrud.ts
 * @description CRUD 도구 입출력 스키마 — create, read, update, delete, move
 */
import type {
  BufferType,
  HubKind,
  Layer,
  PromotionTarget,
  SubLayer,
} from './common.js';
import type { KnowledgeNode } from './graph.js';
import type { L1ChangeReason } from './l1Amendment.js';

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
  /** 서브레이어 (L3 전용: relational/structural/topical) */
  sub_layer?: SubLayer;
  /** 문서 콘텐츠에서 언급된 인물 목록 (선택, 모든 레이어) */
  mentioned_persons?: string[];
  /** 한 줄 요약 — L1 turn-context gist (선택) */
  gist?: string;
  /** 미분류 항목의 종류 (L5 전용) */
  buffer_type?: BufferType;
  /** 승격 대상 서브레이어 (L5 전용) */
  promotion_target?: PromotionTarget;
  /** 항목의 출처 서술 (L5 전용) */
  source_context?: string;
  /** 교차 연결 허브 여부 (레이어 직교, L5 제외) */
  hub?: boolean;
  /** 허브 문서의 종류 (hub=true일 때만 유효) */
  hub_kind?: HubKind;
  /** 이 허브가 무엇을 통합하는지 한 줄 서술 (hub=true일 때 필수) */
  purpose?: string;
}

/** `read` 입력 */
export interface MaencofReadInput {
  /** 문서 경로 (vault 상대 경로) */
  path: string;
}

/** `update` 입력 — frontmatter 부분 업데이트 + 필드 제거 */
export interface MaencofUpdateFrontmatter {
  tags?: string[];
  title?: string;
  layer?: Layer;
  confidence?: number;
  schedule?: string;
  sub_layer?: SubLayer;
  /** 한 줄 요약 — L1 turn-context gist (선택) */
  gist?: string;
  /** 교차 연결 허브 여부 — 기존 문서를 허브로 승격하는 경로 */
  hub?: boolean;
  /** 허브 문서의 종류 */
  hub_kind?: HubKind;
  /** 이 허브가 무엇을 통합하는지 한 줄 서술 */
  purpose?: string;
  /**
   * 제거할 frontmatter 필드 이름 목록.
   * 보호 필드(created, updated, layer, tags)는 unset 거부.
   * L1 경로에서는 unset 자체 차단.
   */
  unset?: string[];
}

/** `update` 입력 */
export interface MaencofUpdateInput {
  /** 문서 경로 */
  path: string;
  /** 새 내용 (마크다운, 생략 시 기존 내용 유지) */
  content?: string;
  /** Frontmatter 부분 업데이트 (선택) */
  frontmatter?: MaencofUpdateFrontmatter;
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
  /** 목표 레이어/서브레이어 아래 중첩 디렉토리 (최대 깊이 2) */
  target_subdirectory?: string;
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
}
