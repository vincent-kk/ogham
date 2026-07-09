/**
 * @file classifyMultiToken.ts
 * @description 다토큰(AND) 시드의 매칭 점수를 산정한다.
 * - 토큰별 classifyMatch 의 최저 점수(weakest-link)를 기본 점수로 사용.
 * - 제목에 phrase 가 연속 등장하면 PHRASE_CONTIGUITY_BONUS 가산 (분리자 정규화 후 비교).
 */
import { PHRASE_CONTIGUITY_BONUS } from '../../../constants/queryEngine.js';
import { normalizePhrase } from '../tokenize/normalizePhrase.js';
import type { MatchType } from '../types/types.js';

import { classifyMatch } from './classifyMatch.js';

export function classifyMultiToken(
  node: { title: string; tags: string[] },
  tokens: string[],
  phrase: string,
): { score: number; type: MatchType } {
  const titleNorm = normalizePhrase(node.title);
  // 정규화된 제목이 phrase 와 완전 일치 → 단일 토큰 title-exact 와 동등하게 취급.
  if (phrase.length > 0 && titleNorm === phrase)
    return { score: 1.0, type: 'title-exact' };

  let minScore = 1.0;
  let worstType: MatchType = 'title-word';
  for (const token of tokens) {
    const { score, type } = classifyMatch(node, token);
    if (score < minScore) {
      minScore = score;
      worstType = type;
    }
  }
  const contiguous = phrase.length > 0 && titleNorm.includes(phrase);
  const score = Math.min(
    1.0,
    minScore + (contiguous ? PHRASE_CONTIGUITY_BONUS : 0),
  );
  return { score, type: contiguous ? 'title-word' : worstType };
}
