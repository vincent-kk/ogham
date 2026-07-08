/**
 * @file normalizePersonalContext.ts
 * @description personal-context.json 원시 JSON의 zod-free graceful 정규화.
 *
 * 훅 번들(sessionStart/sessionEnd)이 도달하는 경로 — 검증 런타임 금지.
 * 손상·손편집 파일에서 구조가 불완전한 항목은 조용히 drop한다 (렌더에
 * 이상 값이 주입되는 것 방지). 정상 경로(MCP가 쓴 파일)에서는 drop이 없다.
 */
import {
  DEFAULT_PERSONAL_CONTEXT_CONFIG,
  PERSONAL_CONTEXT_SCHEMA_VERSION,
} from '../../constants/personalContext.js';
import type {
  PersonalContextFile,
  PersonalState,
  PersonalStateIntensity,
  PersonalTopic,
} from '../../types/personalContext.js';

const INTENSITIES: readonly PersonalStateIntensity[] = ['low', 'medium', 'high'];

export function defaultPersonalContext(): PersonalContextFile {
  return {
    _schemaVersion: PERSONAL_CONTEXT_SCHEMA_VERSION,
    config: { ...DEFAULT_PERSONAL_CONTEXT_CONFIG },
    states: [],
    topics: [],
  };
}

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
      enabled: isRecord(raw.config) ? raw.config.enabled !== false : true,
    },
    states,
    topics,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
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
    !INTENSITIES.includes(raw.intensity as PersonalStateIntensity) ||
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
    reinforceCount:
      typeof raw.reinforceCount === 'number' &&
      Number.isFinite(raw.reinforceCount)
        ? raw.reinforceCount
        : 1,
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
    touchCount:
      typeof raw.touchCount === 'number' && Number.isFinite(raw.touchCount)
        ? raw.touchCount
        : 1,
  };
  if (isNonEmptyString(raw.note)) topic.note = raw.note;
  if (isNonEmptyString(raw.due)) topic.due = raw.due;
  return topic;
}
