/**
 * @file companionGuard.ts
 * @description AI Companion Identity 수동 타입 가드 (Zod-free)
 *
 * session-start hook에서 사용. Zod를 import하지 않아 hook 번들 크기를 보전한다.
 * 타입 정의는 companion.ts의 Zod 스키마와 동기화 유지할 것.
 */

/** AI 동반자 성격 객체 형식 (Zod CompanionPersonalitySchema의 관용 버전) */
export interface CompanionPersonalityMinimal {
  tone?: string;
  approach?: string;
  traits?: string[];
}

/** AI 동반자 자아 정체성 최소 인터페이스 (hook용) */
export interface CompanionIdentityMinimal {
  name: string;
  greeting: string;
  role?: string;
  /** 정본은 객체 형식. setup 위저드가 서술형 string으로 저장한 파일도 수용 */
  personality?: CompanionPersonalityMinimal | string;
  principles?: string[];
  taboos?: string[];
  origin_story?: string;
}

/**
 * 수동 타입 가드: session-start hook에서 Zod 없이 companion identity를 검증.
 * name과 greeting만 필수. Zod 유효 -> 수동 유효가 항상 성립.
 */
export function isValidCompanionIdentity(
  raw: unknown,
): raw is CompanionIdentityMinimal {
  if (raw === null || typeof raw !== 'object') return false;
  const obj = raw as Record<string, unknown>;
  return (
    typeof obj.name === 'string' &&
    obj.name.length > 0 &&
    typeof obj.greeting === 'string' &&
    obj.greeting.length > 0
  );
}
