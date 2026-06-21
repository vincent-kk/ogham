/**
 * @file workHistory.ts
 * @description 작업 이력 타입 — daily digest, 역색인, 기간 요약, work_history 도구 I/O.
 *
 * per-session 레코드(SessionRecord)와 활동 로그(NDJSON)에서 파생되는 읽기 전용 집계 계층.
 */

/** 일일 작업 digest — `activity/digests/daily/YYYY-MM-DD.json`. */
export interface DailyDigest {
  /** YYYY-MM-DD */
  date: string;
  /** 그날 세션 수 */
  sessionCount: number;
  /** 마감된 세션들의 (endedAt-startedAt) 합(분) */
  totalDurationMin: number;
  /** 세션 vaultOps 차분의 일일 합산 */
  vaultOps: Record<string, number>;
  /** 그날 건드린 문서 경로 합집합 (상한 적용) */
  filePaths: string[];
  /** 추론된 레이어 디렉터리 이름 (예: 01_Core) */
  layers: string[];
  /** 추론된 토픽 (파일명 stem) */
  topics: string[];
}

/** 토픽/레이어 → 작업일자(내림차순) 역색인 — on-demand 재파생 가속 캐시. */
export interface ReverseIndex {
  /** 마지막 재파생 시각 (ISO) */
  updatedAt: string;
  /** 색인이 포괄하는 최신 일자 (freshness 판정용) */
  coversThrough: string | null;
  /** key(토픽/레이어) → 작업일자 배열(내림차순) */
  index: Record<string, string[]>;
}

/** 기간 작업 요약 — daily digest 합산 결과. */
export interface WorkPeriodSummary {
  from: string;
  to: string;
  /** 활동이 있었던 일수 */
  activeDays: number;
  sessionCount: number;
  totalDurationMin: number;
  vaultOps: Record<string, number>;
  /** 작업일수 기준 상위 토픽 */
  topTopics: { topic: string; days: number }[];
  /** 기간 내 등장한 레이어 */
  layers: string[];
}

/** work_history MCP 입력. */
export interface WorkHistoryReadInput {
  /** 최근 N일 기간 요약 (from/to 미지정 시, 기본 7, 최대 90) */
  last_days?: number;
  /** 기간 시작 YYYY-MM-DD (to 와 함께 사용) */
  from?: string;
  /** 기간 끝 YYYY-MM-DD */
  to?: string;
  /** 토픽 질의 — 해당 토픽의 작업일자 이력 반환 */
  topic?: string;
  /** 레이어 질의 — 해당 레이어 디렉터리(예: 01_Core)의 작업일자 이력 반환 */
  layer?: string;
}

/** work_history MCP 출력 — period 요약 또는 topic/layer 이력 중 하나. */
export interface WorkHistoryReadResult {
  /** period 모드 결과 */
  period?: WorkPeriodSummary;
  /** topic/layer 모드 결과 */
  lookup?: {
    kind: 'topic' | 'layer';
    key: string;
    /** 가장 최근 작업일 (없으면 null) */
    lastWorkedOn: string | null;
    /** 작업일자 이력 (내림차순) */
    dates: string[];
  };
}
