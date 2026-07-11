/**
 * @file isDateInWindow.ts
 * @description YYYY-MM-DD 날짜가 [since, until] 포함 구간에 드는지 판정 (양 끝 inclusive).
 * 빈 bound = 해당 방향 미제한. 사전식 문자열 비교(= 시간순), Date 파싱 없음.
 */
export function isDateInWindow(
  date: string,
  since?: string,
  until?: string,
): boolean {
  if (since && date < since) return false;
  if (until && date > until) return false;
  return true;
}
