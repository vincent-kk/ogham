/**
 * @file tag-similarity.ts
 * @description 태그 기반 Jaccard 유사도 계산 — 지식 연결 추천용
 */

/**
 * 태그를 정규화한다 (소문자, 트림, 중복 제거).
 */
export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const tag of tags) {
    const normalized = tag.toLowerCase().trim();
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      result.push(normalized);
    }
  }
  return result;
}

/**
 * Jaccard 유사도: |A ∩ B| / |A ∪ B|
 *
 * @param a - 태그 집합 A (정규화 전)
 * @param b - 태그 집합 B (정규화 전)
 * @returns 0.0 ~ 1.0 유사도 (공집합이면 0)
 */
export function jaccardSimilarity(a: string[], b: string[]): number {
  const setA = new Set(normalizeTags(a));
  const setB = new Set(normalizeTags(b));

  if (setA.size === 0 && setB.size === 0) return 0;

  let intersection = 0;
  for (const tag of setA) {
    if (setB.has(tag)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * 내용에서 키워드를 추출한다 (단순 토큰화).
 * 한/영 단어를 추출하며 불용어를 제거한다.
 *
 * @param content - 내용 문자열
 * @param maxKeywords - 최대 추출 수 (기본 10)
 */
export function extractKeywords(content: string, maxKeywords = 10): string[] {
  const STOPWORDS = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'shall', 'can', 'and', 'or', 'but', 'in',
    'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'into',
    'through', 'during', 'before', 'after', 'about', 'between', 'this',
    'that', 'these', 'those', 'it', 'its', 'not', 'no', 'so', 'if',
    'then', 'than', 'too', 'very', 'just', 'also', 'more', 'most',
    '이', '그', '저', '및', '또는', '그리고', '하지만', '그러나',
    '위해', '대한', '통해', '따라', '대해',
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

/**
 * 공통 태그 목록을 반환한다.
 */
export function commonTags(a: string[], b: string[]): string[] {
  const setA = new Set(normalizeTags(a));
  const setB = new Set(normalizeTags(b));
  const result: string[] = [];
  for (const tag of setA) {
    if (setB.has(tag)) result.push(tag);
  }
  return result;
}
