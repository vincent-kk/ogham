/**
 * @file commonTags.ts
 * @description 공통 태그 목록을 반환한다.
 */
import { normalizeTags } from './normalizeTags.js';

export function commonTags(a: string[], b: string[]): string[] {
  const setA = new Set(normalizeTags(a));
  const setB = new Set(normalizeTags(b));
  const result: string[] = [];
  for (const tag of setA) if (setB.has(tag)) result.push(tag);

  return result;
}
