/**
 * @file collectQueryTokens.ts
 * @description 비-경로 시드에서 QGA 게이트용 쿼리 토큰을 수집한다 (dedup, lowercase).
 * 경로 시드만 있으면 빈 배열 → 게이트 비활성.
 */
import { isPathSeed } from '../seeds/isPathSeed.js';
import { tokenizeSeed } from '../tokenize/tokenizeSeed.js';

export function collectQueryTokens(seeds: string[]): string[] {
  const tokens = new Set<string>();
  for (const seed of seeds) {
    if (isPathSeed(seed)) continue;
    for (const token of tokenizeSeed(seed)) tokens.add(token);
  }
  return Array.from(tokens);
}
