/**
 * @file tag-similarity.test.ts
 * @description 태그 Jaccard 유사도 함수 단위 테스트
 */
import { describe, expect, it } from 'vitest';

import {
  commonTags,
  extractKeywords,
  jaccardSimilarity,
  normalizeTags,
} from '../../core/tag-similarity.js';

describe('normalizeTags', () => {
  it('소문자로 변환하고 중복을 제거한다', () => {
    expect(normalizeTags(['TypeScript', 'typescript', 'MCP'])).toEqual([
      'typescript',
      'mcp',
    ]);
  });

  it('빈 문자열과 공백을 제거한다', () => {
    expect(normalizeTags(['', '  ', 'valid'])).toEqual(['valid']);
  });

  it('빈 배열이면 빈 배열을 반환한다', () => {
    expect(normalizeTags([])).toEqual([]);
  });
});

describe('jaccardSimilarity', () => {
  it('동일한 태그면 1.0을 반환한다', () => {
    expect(jaccardSimilarity(['a', 'b'], ['a', 'b'])).toBe(1.0);
  });

  it('겹치는 태그가 없으면 0을 반환한다', () => {
    expect(jaccardSimilarity(['a', 'b'], ['c', 'd'])).toBe(0);
  });

  it('부분 겹침을 올바르게 계산한다', () => {
    // |{a,b} ∩ {b,c}| / |{a,b} ∪ {b,c}| = 1/3
    expect(jaccardSimilarity(['a', 'b'], ['b', 'c'])).toBeCloseTo(1 / 3);
  });

  it('대소문자 무시로 비교한다', () => {
    expect(jaccardSimilarity(['TypeScript'], ['typescript'])).toBe(1.0);
  });

  it('양쪽 모두 빈 배열이면 0을 반환한다', () => {
    expect(jaccardSimilarity([], [])).toBe(0);
  });

  it('한쪽만 빈 배열이면 0을 반환한다', () => {
    expect(jaccardSimilarity(['a'], [])).toBe(0);
  });
});

describe('extractKeywords', () => {
  it('영문 키워드를 추출한다', () => {
    const keywords = extractKeywords('TypeScript is a great language for MCP development');
    expect(keywords).toContain('typescript');
    expect(keywords).toContain('great');
    expect(keywords).toContain('language');
  });

  it('불용어를 제거한다', () => {
    const keywords = extractKeywords('the quick brown fox is very fast');
    expect(keywords).not.toContain('the');
    expect(keywords).not.toContain('is');
    expect(keywords).not.toContain('very');
  });

  it('한글 키워드를 추출한다', () => {
    const keywords = extractKeywords('지식 그래프 기반 검색 엔진');
    expect(keywords).toContain('지식');
    expect(keywords).toContain('그래프');
  });

  it('maxKeywords로 결과를 제한한다', () => {
    const keywords = extractKeywords(
      'one two three four five six seven eight nine ten eleven twelve',
      3,
    );
    expect(keywords.length).toBeLessThanOrEqual(3);
  });

  it('빈 문자열이면 빈 배열을 반환한다', () => {
    expect(extractKeywords('')).toEqual([]);
  });
});

describe('commonTags', () => {
  it('공통 태그를 반환한다', () => {
    expect(commonTags(['a', 'b', 'c'], ['b', 'c', 'd'])).toEqual(['b', 'c']);
  });

  it('겹치지 않으면 빈 배열을 반환한다', () => {
    expect(commonTags(['a'], ['b'])).toEqual([]);
  });
});
