/** kg_context 탐색 폭 object enum — 소비처는 문자열 리터럴 대신 멤버를 참조한다. */
export const KgContextScope = {
  FOCUSED: 'focused',
  BALANCED: 'balanced',
  BROAD: 'broad',
} as const;

export type KgContextScope =
  (typeof KgContextScope)[keyof typeof KgContextScope];

/**
 * kg_context scope 프리셋 — 의미론적 탐색 폭을 SA 내부 파라미터로 변환.
 * BALANCED 는 scope 도입 이전 하드코딩 값과 동일해야 한다 (하위호환 계약).
 */
export const KG_CONTEXT_SCOPE_PRESETS: Record<
  KgContextScope,
  { threshold: number; maxHops: number }
> = {
  [KgContextScope.FOCUSED]: { threshold: 0.1, maxHops: 3 },
  [KgContextScope.BALANCED]: { threshold: 0.05, maxHops: 5 },
  [KgContextScope.BROAD]: { threshold: 0.02, maxHops: 7 },
};
