/**
 * @file extractKeywords.ts
 * @description 내용에서 키워드를 추출한다 (단순 토큰화).
 * 한/영 단어를 추출하며 불용어를 제거한다.
 */

/**
 * @param content - 내용 문자열
 * @param maxKeywords - 최대 추출 수 (기본 10)
 */
export function extractKeywords(content: string, maxKeywords = 10): string[] {
  const STOPWORDS = new Set([
    'the',
    'a',
    'an',
    'is',
    'are',
    'was',
    'were',
    'be',
    'been',
    'being',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'could',
    'should',
    'may',
    'might',
    'shall',
    'can',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'with',
    'by',
    'from',
    'as',
    'into',
    'through',
    'during',
    'before',
    'after',
    'about',
    'between',
    'this',
    'that',
    'these',
    'those',
    'it',
    'its',
    'not',
    'no',
    'so',
    'if',
    'then',
    'than',
    'too',
    'very',
    'just',
    'also',
    'more',
    'most',
    '이',
    '그',
    '저',
    '및',
    '또는',
    '그리고',
    '하지만',
    '그러나',
    '위해',
    '대한',
    '통해',
    '따라',
    '대해',
  ]);

  // 한글 또는 영문 단어 추출 (2글자 이상)
  const words = content.match(/[a-zA-Z]{2,}|[가-힣]{2,}/g) ?? [];

  const freq = new Map<string, number>();
  for (const word of words) {
    const lower = word.toLowerCase();
    if (STOPWORDS.has(lower)) continue;
    freq.set(lower, (freq.get(lower) ?? 0) + 1);
  }

  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word);
}
