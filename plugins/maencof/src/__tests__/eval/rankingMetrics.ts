/**
 * @file rankingMetrics.ts
 * @description 랭킹 품질 지표 — nDCG@k, Recall@k, MRR (전부 순수 함수).
 *
 * 정의는 설계서 03장과 일치: DCG = Σ (2^rel − 1)/log₂(i+2), Recall@k = 상위 k 내
 * rel≥1 문서 수 / 전체 rel≥1 문서 수, MRR = 첫 rel≥1 문서의 역순위.
 */

/** ranked: 상위부터의 문서 경로 목록, relevance: path → 등급(0 생략) */
export function ndcgAt(
  k: number,
  ranked: string[],
  relevance: Record<string, number>,
): number {
  const gains = ranked.slice(0, k).map((path) => relevance[path] ?? 0);
  const dcg = discountedGain(gains);

  const ideal = Object.values(relevance)
    .filter((rel) => rel > 0)
    .sort((a, b) => b - a)
    .slice(0, k);
  const idcg = discountedGain(ideal);

  if (idcg === 0) return 0;
  return dcg / idcg;
}

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

export function mrr(
  ranked: string[],
  relevance: Record<string, number>,
): number {
  for (let i = 0; i < ranked.length; i++)
    if ((relevance[ranked[i]!] ?? 0) > 0) return 1 / (i + 1);

  return 0;
}

function discountedGain(gains: number[]): number {
  let sum = 0;
  for (let i = 0; i < gains.length; i++)
    sum += (Math.pow(2, gains[i]!) - 1) / Math.log2(i + 2);

  return sum;
}
