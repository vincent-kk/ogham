/**
 * @file mrr.ts
 * @description MRR — 첫 rel≥1 문서의 역순위 (설계서 03장).
 */
export function mrr(
  ranked: string[],
  relevance: Record<string, number>,
): number {
  for (let i = 0; i < ranked.length; i++)
    if ((relevance[ranked[i]!] ?? 0) > 0) return 1 / (i + 1);

  return 0;
}
