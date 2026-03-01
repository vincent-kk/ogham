/**
 * @file dailynote.ts
 * @description Dailynote 타입 정의 — 일일 활동 로그 자동 기록
 *
 * dailynote는 maencof가 자기 자신의 활동을 기록하는 운영 로그(audit trail)이다.
 * 5-Layer Knowledge Model 외부(.maencof-meta/dailynotes/)에 저장되며,
 * Knowledge Graph와 통합하지 않는다.
 */

/** 단일 dailynote 엔트리 */
export interface DailynoteEntry {
  /** HH:MM 형식 타임스탬프 */
  time: string;
  /** 이벤트 카테고리 */
  category: DailynoteCategory;
  /** 이벤트 설명 */
  description: string;
  /** 관련 문서 경로 (선택) */
  path?: string;
}

/** 이벤트 카테고리 */
export type DailynoteCategory =
  | 'document'
  | 'search'
  | 'index'
  | 'config'
  | 'session'
  | 'diagnostic';

/**
 * MCP 도구명 → 카테고리 매핑 (전체 14개 도구).
 *
 * PostToolUse hook matcher는 write 도구 5개만 사용
 * (maencof_create|maencof_update|maencof_delete|maencof_move|claudemd_merge).
 * TOOL_CATEGORY_MAP은 전체 도구를 포함하여 향후 opt-in 확장에 대비한다.
 * dailynote_read는 의도적으로 제외 — 재귀적 기록 방지.
 */
export const TOOL_CATEGORY_MAP: Record<string, DailynoteCategory> = {
  maencof_create: 'document',
  maencof_read: 'document',
  maencof_update: 'document',
  maencof_delete: 'document',
  maencof_move: 'document',
  kg_search: 'search',
  kg_navigate: 'search',
  kg_context: 'search',
  kg_build: 'index',
  kg_status: 'index',
  kg_suggest_links: 'search',
  claudemd_merge: 'config',
  claudemd_read: 'config',
  claudemd_remove: 'config',
};

/** dailynote_read MCP 입력 */
export interface DailynoteReadInput {
  /** 조회할 날짜 YYYY-MM-DD (기본: 오늘) */
  date?: string;
  /** 카테고리 필터 (선택) */
  category?: DailynoteCategory;
  /** 최근 N일 조회 (date 대신 사용, 기본 1) */
  last_days?: number;
}

/** dailynote_read MCP 출력 */
export interface DailynoteReadResult {
  /** 조회된 dailynote 목록 (날짜별) */
  notes: Array<{
    date: string;
    entries: DailynoteEntry[];
    entry_count: number;
  }>;
  /** 총 엔트리 수 */
  total_entries: number;
}
