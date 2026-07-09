/**
 * @file recallAt.ts
 * @description Recall@k — 상위 k 내 rel≥1 문서 수 / 전체 rel≥1 문서 수 (설계서 03장).
 */
export function recallAt(
  k: number,
  ranked: string[],
  relevance: Record<string, number>,
): number {
  const relevantTotal = Object.values(relevance).filter(
    (rel) => rel > 0,
  ).length;
  if (relevantTotal === 0) return 0;

  let hit = 0;
  for (const path of ranked.slice(0, k)) if ((relevance[path] ?? 0) > 0) hit++;

  return hit / relevantTotal;
}
