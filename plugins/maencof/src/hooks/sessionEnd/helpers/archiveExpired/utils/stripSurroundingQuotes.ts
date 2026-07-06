/**
 * @file stripSurroundingQuotes.ts
 * @description YAML 스칼라 값에서 감싼 따옴표(큰/작은)를 제거한다.
 */
export function stripSurroundingQuotes(value: string): string {
  const trimmedValue = value.trim();
  if (
    (trimmedValue.startsWith('"') && trimmedValue.endsWith('"')) ||
    (trimmedValue.startsWith("'") && trimmedValue.endsWith("'"))
  )
    return trimmedValue.slice(1, -1);
  return trimmedValue;
}
