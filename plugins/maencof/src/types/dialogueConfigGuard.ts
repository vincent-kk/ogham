/**
 * @file dialogueConfigGuard.ts
 * @description Dialogue Config 수동 타입 가드 (Zod-free)
 *
 * session-start / session-end hook에서 사용.
 * Zod를 import하지 않아 hook 번들 크기를 보전한다.
 * 타입 정의는 dialogueConfig.ts의 Zod 스키마와 동기화 유지할 것.
 */
import { DEFAULT_DIALOGUE_CONFIG } from '../constants/dialogue.js';

import type { DialogueConfig } from './dialogueConfig.js';

/** Dialogue Config 최소 인터페이스 (hook용). zod 객체 형태와 등가. */
export interface DialogueConfigMinimal {
  schema_version?: unknown;
  injection?: unknown;
}

/**
 * 수동 타입 가드: dialogue-config hook 경로에서 Zod 없이 config 객체 형태를 검증.
 * Zod보다 관대한 superset: 객체이면 통과시키고 세부 검증은 normalize에 위임.
 * Zod 유효 → 수동 유효가 항상 성립.
 */
export function isValidDialogueConfig(
  raw: unknown,
): raw is DialogueConfigMinimal {
  return raw !== null && typeof raw === 'object' && !Array.isArray(raw);
}

function normalizeBoolean(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

function normalizePositiveInt(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : fallback;
}

function normalizeInjection(v: unknown): DialogueConfig['injection'] {
  const def = DEFAULT_DIALOGUE_CONFIG.injection;
  if (v === null || typeof v !== 'object' || Array.isArray(v))
    return { ...def };
  const obj = v as Record<string, unknown>;
  return {
    enabled: normalizeBoolean(obj.enabled, def.enabled),
    budget_chars: normalizePositiveInt(obj.budget_chars, def.budget_chars),
  };
}

/**
 * 부분 필드 누락 시 DEFAULT_DIALOGUE_CONFIG로 채워주는 정규화 헬퍼.
 * Zod 스키마의 .default(...) 흐름을 수동으로 재현한다. 알 수 없는 키
 * (retired `session_recap` 등)는 조용히 무시된다.
 */
export function normalizeDialogueConfig(raw: unknown): DialogueConfig {
  if (!isValidDialogueConfig(raw))
    return {
      ...DEFAULT_DIALOGUE_CONFIG,
      injection: { ...DEFAULT_DIALOGUE_CONFIG.injection },
    };
  const obj = raw as Record<string, unknown>;
  return {
    schema_version: normalizePositiveInt(
      obj.schema_version,
      DEFAULT_DIALOGUE_CONFIG.schema_version,
    ),
    injection: normalizeInjection(obj.injection),
  };
}
