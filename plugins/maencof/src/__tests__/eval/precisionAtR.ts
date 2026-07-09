/**
 * @file precisionAtR.ts
 * @description R-precision — 상위 R개 중 rel≥1 문서 비율 (R = 전체 rel≥1 문서 수).
 * 무관 문서(동형이의어 노이즈)가 상위를 채우면 직접 하락하는 precision 눈금 —
 * nDCG가 둔감한 소수-정답 쿼리의 상위권 오염을 잡는다.
 */
export function precisionAtR(
  ranked: string[],
  relevance: Record<string, number>,
): number {
  const relevantTotal = Object.values(relevance).filter(
    (rel) => rel > 0,
  ).length;
  if (relevantTotal === 0) return 0;

  let hit = 0;
  for (const path of ranked.slice(0, relevantTotal))
    if ((relevance[path] ?? 0) > 0) hit++;

  return hit / relevantTotal;
}
