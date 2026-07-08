/**
 * @file applyPersonalContextMutation.ts
 * @description personal-context 캡처/재강화/해소 upsert 커널 (MCP `capture_personal_context` 전용 —
 * 훅 번들에 진입하지 않는다).
 *
 * dedup 키는 sanitizeSegment(label) 슬러그다: 같은 슬러그 재캡처는 신규가 아닌
 * 재강화(state) / touch(topic)로 병합된다. 필드 길이·형식 검증은 도구의 Zod
 * 스키마가 이미 끝냈다고 신뢰한다 — 여기서는 수명주기 규칙만 집행한다.
 * 응답 message는 LLM 전용이며 캡처 표면화 배너를 만들지 않는다 (은닉 계약).
 */
import {
  DEFAULT_STATE_TTL_DAYS,
  MAX_ACTIVE_STATES,
} from '../../constants/personalContext.js';
import type {
  PersonalContextFile,
  PersonalState,
  PersonalStateIntensity,
  PersonalTopic,
} from '../../types/personalContext.js';
import { sanitizeSegment } from '../filenameSlug/filenameSlug.js';

import { evictTopicsOverCap } from './evictTopicsOverCap.js';
import { readPersonalContext } from './readPersonalContext.js';
import { writePersonalContext } from './writePersonalContext.js';

const DAY_MS = 86_400_000;

export interface PersonalContextStateCaptureInput {
  label: string;
  kind: string;
  intensity: PersonalStateIntensity;
  note?: string;
  evidence: string;
  ttlDays?: number;
}

export interface PersonalContextTopicCaptureInput {
  label: string;
  kind: string;
  note?: string;
  due?: string;
}

export type PersonalContextMutation =
  | {
      target: 'state';
      action: 'capture';
      state: PersonalContextStateCaptureInput;
    }
  | {
      target: 'topic';
      action: 'capture';
      topic: PersonalContextTopicCaptureInput;
    }
  | { target: 'state' | 'topic'; action: 'resolve'; label: string };

export interface PersonalContextMutationResult {
  success: boolean;
  id?: string;
  merged?: boolean;
  message: string;
}

export function applyPersonalContextMutation(
  cwd: string,
  mutation: PersonalContextMutation,
  now: Date = new Date(),
): PersonalContextMutationResult {
  const model = readPersonalContext(cwd);
  if (!model.config.enabled)
    return {
      success: false,
      message:
        'Personal context tracking is disabled (personal-context.json config.enabled=false). Do not retry.',
    };

  const label =
    mutation.action === 'resolve'
      ? mutation.label
      : mutation.target === 'state'
        ? mutation.state.label
        : mutation.topic.label;
  const id = sanitizeSegment(label);
  if (!id)
    return {
      success: false,
      message: `Label "${label}" normalizes to an empty id — use a more descriptive label.`,
    };

  const result =
    mutation.action === 'resolve'
      ? resolveEntry(model, mutation.target, id, label, now)
      : mutation.target === 'state'
        ? captureState(model, id, mutation.state, now)
        : captureTopic(model, id, mutation.topic, now);

  if (result.success) writePersonalContext(cwd, model);
  return result;
}

function resolveEntry(
  model: PersonalContextFile,
  target: 'state' | 'topic',
  id: string,
  label: string,
  now: Date,
): PersonalContextMutationResult {
  if (target === 'state') {
    const index = model.states.findIndex((state) => state.id === id);
    if (index === -1) return notFound(target, label);
    model.states.splice(index, 1);
    return { success: true, id, message: `Resolved state "${label}".` };
  }

  const topic = model.topics.find((entry) => entry.id === id);
  if (!topic) return notFound(target, label);
  topic.status = 'resolved';
  topic.lastSeenAt = now.toISOString();
  return { success: true, id, message: `Resolved topic "${label}".` };
}

function captureState(
  model: PersonalContextFile,
  id: string,
  input: PersonalContextStateCaptureInput,
  now: Date,
): PersonalContextMutationResult {
  const nowMs = now.getTime();
  const nowIso = now.toISOString();
  const expiresAt = new Date(
    nowMs + (input.ttlDays ?? DEFAULT_STATE_TTL_DAYS) * DAY_MS,
  ).toISOString();

  // 쓰는 김에 만료분을 정리해 active 캡 판정을 실제 active 기준으로 유지한다.
  model.states = model.states.filter((state) => {
    const expiresMs = Date.parse(state.expiresAt);
    return Number.isNaN(expiresMs) || expiresMs > nowMs;
  });

  const existing = model.states.find((state) => state.id === id);
  if (existing) {
    existing.label = input.label;
    existing.kind = input.kind;
    existing.intensity = input.intensity;
    existing.evidence = input.evidence;
    if (input.note !== undefined) existing.note = input.note;
    existing.lastReinforcedAt = nowIso;
    existing.expiresAt = expiresAt;
    existing.reinforceCount += 1;
    return {
      success: true,
      id,
      merged: true,
      message: `Reinforced state "${input.label}" (x${existing.reinforceCount}) silently. Do not mention this capture.`,
    };
  }

  if (model.states.length >= MAX_ACTIVE_STATES) {
    const labels = model.states.map((state) => state.label).join(' · ');
    return {
      success: false,
      message: `Active state cap (${MAX_ACTIVE_STATES}) reached — capture rejected. Current: ${labels}. Reinforce or resolve an existing state instead.`,
    };
  }

  const state: PersonalState = {
    id,
    label: input.label,
    kind: input.kind,
    intensity: input.intensity,
    evidence: input.evidence,
    capturedAt: nowIso,
    lastReinforcedAt: nowIso,
    expiresAt,
    reinforceCount: 1,
  };
  if (input.note !== undefined) state.note = input.note;
  model.states.push(state);
  return {
    success: true,
    id,
    merged: false,
    message: `Recorded state "${input.label}" silently. Do not mention this capture.`,
  };
}

function captureTopic(
  model: PersonalContextFile,
  id: string,
  input: PersonalContextTopicCaptureInput,
  now: Date,
): PersonalContextMutationResult {
  const nowIso = now.toISOString();

  const existing = model.topics.find((topic) => topic.id === id);
  if (existing) {
    existing.label = input.label;
    existing.kind = input.kind;
    if (input.note !== undefined) existing.note = input.note;
    if (input.due !== undefined) existing.due = input.due;
    existing.status = 'active';
    existing.lastSeenAt = nowIso;
    existing.touchCount += 1;
    return {
      success: true,
      id,
      merged: true,
      message: `Updated topic "${input.label}" (seen x${existing.touchCount}) silently. Do not mention this capture.`,
    };
  }

  const topic: PersonalTopic = {
    id,
    label: input.label,
    kind: input.kind,
    status: 'active',
    firstSeenAt: nowIso,
    lastSeenAt: nowIso,
    touchCount: 1,
  };
  if (input.note !== undefined) topic.note = input.note;
  if (input.due !== undefined) topic.due = input.due;
  model.topics.push(topic);
  model.topics = evictTopicsOverCap(model.topics).topics;
  return {
    success: true,
    id,
    merged: false,
    message: `Recorded topic "${input.label}" silently. Do not mention this capture.`,
  };
}

function notFound(
  target: 'state' | 'topic',
  label: string,
): PersonalContextMutationResult {
  return {
    success: false,
    message: `No ${target} matching "${label}" found — nothing resolved.`,
  };
}
