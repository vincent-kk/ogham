/**
 * @file ndcgAt.ts
 * @description nDCG@k — DCG = Σ (2^rel − 1)/log₂(i+2), IDCG 로 정규화 (설계서 03장).
 */

/** ranked: 상위부터의 문서 경로 목록, relevance: path → 등급(0 생략) */
export function ndcgAt(
  k: number,
  ranked: string[],
  relevance: Record<string, number>,
): number {
  const discountedGain = (gains: number[]): number => {
    let sum = 0;
    for (let i = 0; i < gains.length; i++)
      sum += (Math.pow(2, gains[i]!) - 1) / Math.log2(i + 2);

    return sum;
  };

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
