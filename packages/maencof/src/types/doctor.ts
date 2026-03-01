/**
 * @file doctor.ts
 * @description 진단 타입 — DiagnosticResult, DiagnosticSeverity, DiagnosticItem, AutoFixAction
 */

/** 진단 심각도 */
export type DiagnosticSeverity = 'error' | 'warning' | 'info';

/** 진단 항목 카테고리 */
export type DiagnosticCategory =
  | 'broken-link'
  | 'missing-frontmatter'
  | 'layer-mismatch'
  | 'expired-document'
  | 'stale-index'
  | 'orphan-node'
  | 'invalid-frontmatter'
  | 'duplicate'
  | 'autonomy-lock';

/** 자동 수정 액션 */
export interface AutoFixAction {
  /** 액션 설명 */
  description: string;
  /** 수정 가능 여부 */
  fixable: boolean;
  /** 수정 명령 (MCP 도구 호출) */
  fix?: () => Promise<void>;
}

/** 개별 진단 항목 */
export interface DiagnosticItem {
  category: DiagnosticCategory;
  severity: DiagnosticSeverity;
  /** 대상 파일 경로 */
  path?: string;
  /** 진단 메시지 */
  message: string;
  /** 자동 수정 액션 */
  autoFix?: AutoFixAction;
}

/** 전체 진단 결과 */
export interface DiagnosticResult {
  /** 전체 진단 항목 */
  items: DiagnosticItem[];
  /** 오류 수 */
  errorCount: number;
  /** 경고 수 */
  warningCount: number;
  /** 정보 수 */
  infoCount: number;
  /** 자동 수정 가능 항목 수 */
  fixableCount: number;
  /** 진단 실행 시간 */
  checkedAt: string;
  /** 진단 소요 시간 (ms) */
  durationMs: number;
}
