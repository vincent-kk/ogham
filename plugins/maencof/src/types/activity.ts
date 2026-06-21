/**
 * @file activity.ts
 * @description 활동 로그 타입 정의 — maencof 자체 활동(audit trail) 기록.
 *
 * 활동 이벤트는 5-Layer Knowledge Model 외부(`.maencof-meta/activity/events/`)에
 * NDJSON 으로 저장되며 Knowledge Graph 와 통합하지 않는다.
 */

/** 단일 활동 엔트리 */
export interface ActivityEntry {
  /** HH:MM 형식 타임스탬프 */
  time: string;
  /** 이벤트 카테고리 */
  category: ActivityCategory;
  /** 이벤트 설명 */
  description: string;
  /** 관련 문서 경로 (선택) */
  path?: string;
}

/** 이벤트 카테고리 */
export type ActivityCategory =
  | 'document'
  | 'search'
  | 'index'
  | 'config'
  | 'diagnostic';

/** activity_read MCP 입력 */
export interface ActivityReadInput {
  /** 조회할 날짜 YYYY-MM-DD (기본: 오늘) */
  date?: string;
  /** 카테고리 필터 (선택) */
  category?: ActivityCategory;
  /** 최근 N일 조회 (date 대신 사용, 기본 1) */
  last_days?: number;
}

/** activity_read MCP 출력 */
export interface ActivityReadResult {
  /** 조회된 활동 목록 (날짜별) */
  notes: Array<{
    date: string;
    entries: ActivityEntry[];
    entry_count: number;
  }>;
  /** 총 엔트리 수 */
  total_entries: number;
}
