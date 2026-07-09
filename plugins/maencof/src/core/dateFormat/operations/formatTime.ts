/**
 * @file formatTime.ts
 * @description 현재 시각을 HH:MM 형식으로 반환한다.
 */
export function formatTime(date: Date): string {
  const HH = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${HH}:${mm}`;
}
