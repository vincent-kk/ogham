/**
 * @file insightGuard.ts
 * @description Insight Config 수동 타입 가드 (Zod-free)
 *
 * session-start / insight-injector hook에서 사용.
 * Zod를 import하지 않아 hook 번들 크기를 보전한다.
 * 타입 정의는 insight.ts의 Zod 스키마와 동기화 유지할 것.
 */
import { DEFAULT_INSIGHT_CONFIG } from '../constants/insight.js';

import type { InsightConfig } from './insight.js';

/** Insight Config 최소 인터페이스 (hook용). zod 객체 형태와 등가. */
export interface InsightConfigMinimal {
  enabled?: unknown;
  sensitivity?: unknown;
  max_captures_per_session?: unknown;
  notify?: unknown;
  category_filter?: unknown;
}

const SENSITIVITY_VALUES = ['high', 'medium', 'low'] as const;
type Sensitivity = (typeof SENSITIVITY_VALUES)[number];

/**
 * 수동 타입 가드: insight-stats hook 경로에서 Zod 없이 config 객체 형태를 검증.
 * Zod보다 관대한 superset: 객체이기만 하면 통과시키고 세부 검증은 normalize에 위임.
 * Zod 유효 → 수동 유효가 항상 성립.
 */
export function isValidInsightConfig(
  raw: unknown,
): raw is InsightConfigMinimal {
  return raw !== null && typeof raw === 'object' && !Array.isArray(raw);
}

function normalizeBoolean(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

function normalizeSensitivity(v: unknown): Sensitivity {
  return (SENSITIVITY_VALUES as readonly unknown[]).includes(v)
    ? (v as Sensitivity)
    : DEFAULT_INSIGHT_CONFIG.sensitivity;
}

function normalizeMaxCaptures(v: unknown): number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0
    ? v
    : DEFAULT_INSIGHT_CONFIG.max_captures_per_session;
}

function normalizeCategoryFilter(v: unknown): InsightConfig['category_filter'] {
  const def = DEFAULT_INSIGHT_CONFIG.category_filter;
  if (v === null || typeof v !== 'object' || Array.isArray(v))
    return { ...def };
  const obj = v as Record<string, unknown>;
  return {
    principle: normalizeBoolean(obj.principle, def.principle),
    refuted_premise: normalizeBoolean(obj.refuted_premise, def.refuted_premise),
    ephemeral_candidate: normalizeBoolean(
      obj.ephemeral_candidate,
      def.ephemeral_candidate,
    ),
  };
}

/**
 * 부분 필드 누락 시 DEFAULT_INSIGHT_CONFIG로 채워주는 정규화 헬퍼.
 * Zod 스키마의 .default(...) 흐름을 수동으로 재현한다.
 */
export function normalizeInsightConfig(raw: unknown): InsightConfig {
  if (!isValidInsightConfig(raw)) return { ...DEFAULT_INSIGHT_CONFIG };
  const obj = raw as Record<string, unknown>;
  return {
    enabled: normalizeBoolean(obj.enabled, DEFAULT_INSIGHT_CONFIG.enabled),
    sensitivity: normalizeSensitivity(obj.sensitivity),
    max_captures_per_session: normalizeMaxCaptures(
      obj.max_captures_per_session,
    ),
    notify: normalizeBoolean(obj.notify, DEFAULT_INSIGHT_CONFIG.notify),
    category_filter: normalizeCategoryFilter(obj.category_filter),
  };
}
