/**
 * @file toIsoDatetime.ts
 * @description 파싱 가능한 날짜 문자열을 완전 ISO datetime으로 강제(Zod-free).
 *
 * v1의 date-only(`2026-05-06`)나 offset 표기를 v2 Zod `z.string().datetime()`가
 * 수용하는 canonical ISO로 맞춘다. 파싱 불가하면 fallback을 반환한다.
 * companionMigration·companionEdit이 strict v2 조립 시 공유한다.
 */

/** value가 파싱되면 canonical ISO로, 아니면 fallback으로 반환한다. */
export function toIsoDatetime(
  value: string | undefined,
  fallback: string,
): string {
  if (value) {
    const ms = Date.parse(value);
    if (!Number.isNaN(ms)) return new Date(ms).toISOString();
  }
  return fallback;
}
