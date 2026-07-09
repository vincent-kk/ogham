/**
 * @file tokenizeSeed.ts
 * @description 시드 문자열을 inverted-index 와 동일 경계로 토큰화한다 (lowercase, 공백 제외).
 */
import { WORD_BOUNDARY_SPLIT_REGEX } from '../../../constants/regexes.js';

export function tokenizeSeed(seed: string): string[] {
  const tokens: string[] = [];
  for (const part of seed.split(WORD_BOUNDARY_SPLIT_REGEX)) {
    const lower = part.toLowerCase();
    if (lower.length > 0) tokens.push(lower);
  }
  return tokens;
}
