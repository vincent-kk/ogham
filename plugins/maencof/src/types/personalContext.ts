/**
 * @file personalContext.ts
 * @description Personal Context 층(`.maencof-meta/personal-context.json`) 도메인 타입.
 *
 * 순수 타입과 도메인 상수(intensity 집합)만 정의한다(zod 없음) — 훅
 * 번들(sessionStart/sessionEnd)이 직접 도달하는 경로이므로 검증 런타임을
 * 끌어오지 않는다. 입력 검증은 MCP 도구(`capture_personal_context`)의 Zod
 * 스키마가, 파일 정규화는 `core/personalContext/normalizePersonalContext`(zod-free)이 담당한다.
 */

/** 상태 강도 — 닫힌 집합의 단일 소스. union 타입은 이 배열에서 파생한다. */
export const PERSONAL_STATE_INTENSITIES = ['low', 'medium', 'high'] as const;

export type PersonalStateIntensity =
  (typeof PERSONAL_STATE_INTENSITIES)[number];

/** 대화에서 포착한 사용자의 일시적 상태 (기분·수면·건강·상황 등). */
export interface PersonalState {
  /** label 정규화 슬러그 (sanitizeSegment) — dedup 키. */
  id: string;
  label: string;
  /** 자유 어휘 (소문자 kebab) — SUGGESTED_STATE_KINDS로 수렴 유도. */
  kind: string;
  intensity: PersonalStateIntensity;
  /** 짧은 묘사 (선택). */
  note?: string;
  /** 근거 — 날짜 + 대화 단서. 근거 없는 상태는 기록하지 않는다. */
  evidence: string;
  capturedAt: string;
  lastReinforcedAt: string;
  /** 만료 시각 — 재강화 없으면 자연 소멸 (영구 상태 불허). */
  expiresAt: string;
  reinforceCount: number;
}

export type PersonalTopicStatus = 'active' | 'resolved';

/** vault 쿼리와 무관하게 유지하는 최근 동향 원장 항목. */
export interface PersonalTopic {
  /** label 정규화 슬러그 (sanitizeSegment) — dedup 키. */
  id: string;
  label: string;
  /** 자유 어휘 (소문자 kebab) — SUGGESTED_TOPIC_KINDS로 수렴 유도. */
  kind: string;
  note?: string;
  status: PersonalTopicStatus;
  /** YYYY-MM-DD — 약속/계획 기한. 경과 + 유예 후 자동 resolved. */
  due?: string;
  firstSeenAt: string;
  /** recency 정렬 키. resolve 시각을 겸한다 (resolved 보존 기간 기준점). */
  lastSeenAt: string;
  touchCount: number;
}

export interface PersonalContextConfig {
  enabled: boolean;
}

/** `.maencof-meta/personal-context.json` envelope. */
export interface PersonalContextFile {
  _schemaVersion: number;
  config: PersonalContextConfig;
  states: PersonalState[];
  topics: PersonalTopic[];
}
