import type { PersonalContextConfig } from '../types/personalContext.js';

/** `.maencof-meta/` 하위 personal-context 파일 이름. */
export const PERSONAL_CONTEXT_FILE = 'personal-context.json';

/** SessionStart `additionalContext`에서 personal-context 블록을 감싸는 XML 태그. */
export const PERSONAL_CONTEXT_TAG = 'personal-context';

export const PERSONAL_CONTEXT_SCHEMA_VERSION = 1;

export const DEFAULT_PERSONAL_CONTEXT_CONFIG: PersonalContextConfig = {
  enabled: true,
};

/** active(미만료) state 상한 — 초과 캡처는 거부하고 현황을 반환해 병합/해소를 유도한다. */
export const MAX_ACTIVE_STATES = 10;

/** topics 보존 상한 — 초과 시 resolved 우선, 다음 oldest-lastSeenAt 순으로 제거. */
export const MAX_TOPICS = 20;

/** SessionStart 주입 시 active topic 상한 (lastSeenAt 내림차순). */
export const MAX_INJECTED_TOPICS = 7;

/** state 유효기간(ttlDays) 기본값과 허용 범위 — 영구 상태 불허의 고정 방지 장치. */
export const DEFAULT_STATE_TTL_DAYS = 14;
export const MIN_STATE_TTL_DAYS = 1;
export const MAX_STATE_TTL_DAYS = 60;

/** resolved topic 보존 기간 — lastSeenAt 기준 경과 시 bootSweep prune이 제거. */
export const RESOLVED_TOPIC_RETENTION_DAYS = 14;

/** due 경과 유예 — 지나면 bootSweep prune이 자동 resolved 처리 (kind 무관). */
export const OVERDUE_TOPIC_GRACE_DAYS = 7;

export const MAX_LABEL_CHARS = 40;
export const MAX_KIND_CHARS = 24;
export const MAX_STATE_NOTE_CHARS = 80;
export const MAX_TOPIC_NOTE_CHARS = 100;
export const MAX_EVIDENCE_CHARS = 100;

/** kind 형식 — 소문자 kebab 단어 (닫힌 enum이 아님; 발산 통제는 캡 + slug dedup 소관). */
export const KIND_PATTERN = /^[a-z][a-z0-9-]*$/;

/** topic due 형식 — YYYY-MM-DD. */
export const DUE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * 제안 어휘 — 스키마 강제가 아니라 도구 description과 주입 지침에 실어
 * 자유 어휘를 자연 수렴시킨다. 고빈도 어휘는 추후 enum 승격 후보.
 */
export const SUGGESTED_STATE_KINDS = [
  'mood',
  'anxiety',
  'sleep',
  'energy',
  'stress',
  'physical-health',
  'chronic-condition',
  'social',
  'motivation',
  'challenge',
] as const;

export const SUGGESTED_TOPIC_KINDS = [
  'work',
  'family',
  'relationship',
  'health',
  'finance',
  'plan',
  'appointment',
  'learning',
  'leisure',
  'travel',
  'concern',
  'interest',
] as const;
