/**
 * @file dateFormat.ts
 * @description 날짜/시간 포맷 순수 헬퍼 (YYYY-MM-DD, HH:MM).
 */

/** 날짜를 YYYY-MM-DD 형식으로 반환한다. */
export function formatDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** 현재 시각을 HH:MM 형식으로 반환한다. */
export function formatTime(date: Date): string {
  const HH = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${HH}:${mm}`;
}
