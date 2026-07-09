/**
 * @file estimateTokens.ts
 * @description 텍스트의 토큰 수를 추정한다.
 * 근사치: 단어 수 * 1.3 (영어 평균), 한국어 포함 시 * 1.5
 */
export function estimateTokens(text: string): number {
  const wordCount = text.split(/\s+/).filter((w) => w.length > 0).length;
  return Math.ceil(wordCount * 1.5);
}
