/**
 * @file diffUsageCounts.ts
 * @description baseline 대비 누적 카운트 차분 (0 초과 항목만).
 */
export function diffUsageCounts(
  baseline: Record<string, number>,
  current: Record<string, number>,
): Record<string, number> {
  const delta: Record<string, number> = {};
  for (const [tool, count] of Object.entries(current)) {
    const diff = count - (baseline[tool] ?? 0);
    if (diff > 0) delta[tool] = diff;
  }
  return delta;
}
