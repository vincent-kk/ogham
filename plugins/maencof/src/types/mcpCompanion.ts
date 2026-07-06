/**
 * @file mcpCompanion.ts
 * @description companion_edit 도구 입출력 스키마 — companion-identity.json 정본 편집.
 */
import type { CompanionIdentity, CompanionInject } from './companion.js';

export type CompanionEditOperation =
  | 'add_section'
  | 'update_section'
  | 'remove_section'
  | 'update_core';

/** section 부분 패치 (add는 key/inject/salience/detail 필수, update는 제공 필드만 병합) */
export interface CompanionSectionPatch {
  key?: string;
  inject?: CompanionInject;
  salience?: number;
  /** 문자열 또는 문자열 배열(렌더 시 `|` join) */
  detail?: string | string[];
  /** 문자열 또는 문자열 배열(렌더 시 `|` join) */
  brief?: string | string[];
  title?: string;
}

/** 코어 필드 부분 패치 (role은 section이므로 update_section으로 편집) */
export interface CompanionCorePatch {
  name?: string;
  greeting?: string;
}

/** companion_edit 입력 */
export interface CompanionEditInput {
  operation: CompanionEditOperation;
  /** update_section / remove_section 대상 section key */
  key?: string;
  section?: CompanionSectionPatch;
  core?: CompanionCorePatch;
  /** false(기본)=preview(diff만, 파일 불변), true=commit(백업 후 저장) */
  commit?: boolean;
}

/** 매 턴 예산 검증 뷰 */
export interface CompanionBudgetView {
  total: number;
  budget: number;
  ok: boolean;
  /** 렌더 길이 큰 순 섹션 — 강등·압축 후보 */
  offenders: { key: string; chars: number }[];
}

/** companion_edit 출력 */
export interface CompanionEditResult {
  success: boolean;
  /** commit && 검증 통과로 실제 저장되었는지 */
  committed: boolean;
  operation: CompanionEditOperation;
  /** 변경 요약 (예: `add_section "humor"`) */
  changed: string;
  message: string;
  /** 커밋을 막는 검증 실패(스키마·500 예산·brief 길이 역전) */
  errors: string[];
  /** 권고성 경고(세션 안전판 초과 등, 커밋 불차단) */
  warnings: string[];
  turn_budget: CompanionBudgetView;
  /** 변경 적용된 정본 후보(검토용). 로드 실패 시 null */
  identity_preview: CompanionIdentity | null;
  /** commit 시 백업 경로 */
  backup_path?: string;
}
