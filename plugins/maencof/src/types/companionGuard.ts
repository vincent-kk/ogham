/**
 * @file companionGuard.ts
 * @description AI Companion Identity 수동 타입 가드 (Zod-free).
 *
 * session-start / userPromptSubmit hook과 turnContext 렌더러에서 사용한다.
 * Zod를 import하지 않아 hook 번들 크기를 보전한다. 타입 정의는 companion.ts의
 * Zod 스키마(v2 정본)와 동기화 유지할 것.
 */

/** 렌더 경로가 소비하는 v2 section 최소 형태 (normalizeToV2 산출물) */
export interface CompanionSectionMinimal {
  key: string;
  inject: 'session' | 'turn' | 'both';
  salience: number;
  detail: string;
  brief?: string;
  title?: string;
}

/**
 * 렌더 경로가 소비하는 v2 identity 최소 형태.
 * 파일이 v1이어도 normalizeToV2가 이 형태로 정규화해 반환한다(graceful).
 */
export interface CompanionIdentityV2Minimal {
  schema_version?: number;
  name: string;
  role?: string;
  greeting: string;
  sections: CompanionSectionMinimal[];
  created_at?: string;
  updated_at?: string;
}

/** 가드 통과 시 보장되는 코어 필드 (name/greeting) */
export interface CompanionCoreMinimal {
  name: string;
  greeting: string;
}

/**
 * 수동 타입 가드: Zod 없이 companion identity의 코어(name/greeting)를 검증.
 * v1·v2·부분 파일 모두에 대해 name과 greeting만 필수. Zod 유효 → 수동 유효가
 * 항상 성립(수동 가드는 superset).
 */
export function isValidCompanionIdentity(
  raw: unknown,
): raw is CompanionCoreMinimal {
  if (raw === null || typeof raw !== 'object') return false;
  const obj = raw as Record<string, unknown>;
  return (
    typeof obj.name === 'string' &&
    obj.name.length > 0 &&
    typeof obj.greeting === 'string' &&
    obj.greeting.length > 0
  );
}

/**
 * schema_version을 읽는다. 없거나 숫자가 아니면 v1로 간주(1).
 * 마이그레이션 멱등 판별과 렌더 경로 정규화 분기에서 공유한다.
 */
export function getCompanionSchemaVersion(raw: unknown): number {
  if (raw === null || typeof raw !== 'object') return 1;
  const v = (raw as Record<string, unknown>).schema_version;
  return typeof v === 'number' && Number.isFinite(v) ? v : 1;
}
