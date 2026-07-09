/**
 * @file normalizePersonalContext.ts
 * @description personal-context.json 원시 JSON의 zod-free graceful 정규화.
 *
 * 훅 번들(sessionStart/sessionEnd)이 도달하는 경로 — 검증 런타임 금지.
 * 손상·손편집 파일에서 구조가 불완전한 항목은 조용히 drop한다 (렌더에
 * 이상 값이 주입되는 것 방지). 정상 경로(MCP가 쓴 파일)에서는 drop이 없다.
 */
import { PERSONAL_CONTEXT_SCHEMA_VERSION } from '../../constants/personalContext.js';
import {
  PERSONAL_STATE_INTENSITIES,
  type PersonalContextFile,
  type PersonalState,
  type PersonalStateIntensity,
  type PersonalTopic,
} from '../../types/personalContext.js';

import { defaultPersonalContext } from './defaultPersonalContext.js';

export function normalizePersonalContext(raw: unknown): PersonalContextFile {
  if (!isRecord(raw)) return defaultPersonalContext();

  const states: PersonalState[] = [];
  if (Array.isArray(raw.states))
    for (const entry of raw.states) {
      const state = normalizeState(entry);
      if (state) states.push(state);
    }

  const topics: PersonalTopic[] = [];
  if (Array.isArray(raw.topics))
    for (const entry of raw.topics) {
      const topic = normalizeTopic(entry);
      if (topic) topics.push(topic);
    }

  return {
    _schemaVersion:
      typeof raw._schemaVersion === 'number'
        ? raw._schemaVersion
        : PERSONAL_CONTEXT_SCHEMA_VERSION,
    config: {
      enabled: isRecord(raw.config) ? isEnabled(raw.config.enabled) : true,
    },
    states,
    topics,
  };
}

/**
 * 손편집 관용 — 명시적 비활성 표기(불리언 false, 문자열 'false', 0)는 모두
 * disabled로 본다. `!== false`만으로는 `"false"`·`0`이 활성으로 새는 허점이 있었다.
 * 그 외 값은 기본 활성.
 */
function isEnabled(value: unknown): boolean {
  return !(value === false || value === 'false' || value === 0);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** 재강화/터치 카운트는 양의 정수만 — 손편집 음수·소수는 1로 되돌린다. */
function normalizeCount(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
    ? value
    : 1;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function normalizeState(raw: unknown): PersonalState | null {
  if (!isRecord(raw)) return null;
  if (
    !isNonEmptyString(raw.id) ||
    !isNonEmptyString(raw.label) ||
    !isNonEmptyString(raw.kind) ||
    !PERSONAL_STATE_INTENSITIES.includes(
      raw.intensity as PersonalStateIntensity,
    ) ||
    typeof raw.evidence !== 'string' ||
    !isNonEmptyString(raw.capturedAt) ||
    !isNonEmptyString(raw.lastReinforcedAt) ||
    !isNonEmptyString(raw.expiresAt)
  )
    return null;

  const state: PersonalState = {
    id: raw.id,
    label: raw.label,
    kind: raw.kind,
    intensity: raw.intensity as PersonalStateIntensity,
    evidence: raw.evidence,
    capturedAt: raw.capturedAt,
    lastReinforcedAt: raw.lastReinforcedAt,
    expiresAt: raw.expiresAt,
    reinforceCount: normalizeCount(raw.reinforceCount),
  };
  if (isNonEmptyString(raw.note)) state.note = raw.note;
  return state;
}

function normalizeTopic(raw: unknown): PersonalTopic | null {
  if (!isRecord(raw)) return null;
  if (
    !isNonEmptyString(raw.id) ||
    !isNonEmptyString(raw.label) ||
    !isNonEmptyString(raw.kind) ||
    (raw.status !== 'active' && raw.status !== 'resolved') ||
    !isNonEmptyString(raw.firstSeenAt) ||
    !isNonEmptyString(raw.lastSeenAt)
  )
    return null;

  const topic: PersonalTopic = {
    id: raw.id,
    label: raw.label,
    kind: raw.kind,
    status: raw.status,
    firstSeenAt: raw.firstSeenAt,
    lastSeenAt: raw.lastSeenAt,
    touchCount: normalizeCount(raw.touchCount),
  };
  if (isNonEmptyString(raw.note)) topic.note = raw.note;
  if (isNonEmptyString(raw.due)) topic.due = raw.due;
  return topic;
}
