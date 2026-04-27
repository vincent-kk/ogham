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
