/**
 * @file normalizePhrase.ts
 * @description 분리자(공백/하이픈/언더스코어 등) 정규화된 phrase 형태로 변환
 * ("investment-fomo" == "investment fomo").
 */
import { tokenizeSeed } from './tokenizeSeed.js';

export function normalizePhrase(s: string): string {
  return tokenizeSeed(s).join(' ');
}
