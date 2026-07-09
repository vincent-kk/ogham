/**
 * @file jaccardSimilarity.ts
 * @description Jaccard 유사도: |A ∩ B| / |A ∪ B|
 */
import { normalizeTags } from './normalizeTags.js';

/**
 * @param a - 태그 집합 A (정규화 전)
 * @param b - 태그 집합 B (정규화 전)
 * @returns 0.0 ~ 1.0 유사도 (공집합이면 0)
 */
export function jaccardSimilarity(a: string[], b: string[]): number {
  const setA = new Set(normalizeTags(a));
  const setB = new Set(normalizeTags(b));

  if (setA.size === 0 && setB.size === 0) return 0;

  let intersection = 0;
  for (const tag of setA) if (setB.has(tag)) intersection++;

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}
