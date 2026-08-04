/**
 * @file extractBestSnippet.ts
 * @description 문서 내용에서 쿼리 키워드와 가장 관련 높은 단락을 추출한다.
 */

/** 잘린 발췌 끝에 붙는 표식 — maxLength 는 표식을 포함한 총 길이 상한이다 */
const ELLIPSIS = ' …';

/** 경계 절단으로 인정하는 창 내 최소 위치 비율 — 이보다 앞의 경계는 다음 단계로 후퇴한다 */
const MIN_CUT_RATIO = 0.5;

/**
 * @param content - 마크다운 문서 전체 내용
 * @param queryTerms - 검색 키워드 목록
 * @param maxLength - 최대 반환 길이 (기본: 300, 절단 표식 포함)
 * @returns 가장 관련성 높은 단락 (초과 시 문장→어절 경계 순으로 절단)
 */
export function extractBestSnippet(
  content: string,
  queryTerms: string[],
  maxLength = 300,
): string {
  const paragraphs = content.split('\n\n').filter((p) => {
    const trimmed = p.trim();
    // Skip empty paragraphs and YAML frontmatter blocks
    if (!trimmed) return false;
    if (trimmed.startsWith('---')) return false;
    return true;
  });

  if (paragraphs.length === 0) return '';

  const lowerTerms = queryTerms.map((t) => t.toLowerCase());

  let bestScore = 0;
  let bestParagraph = paragraphs[0]!.trim();

  for (const para of paragraphs) {
    const lowerPara = para.toLowerCase();
    let score = 0;
    for (const term of lowerTerms) if (lowerPara.includes(term)) score++;

    if (score > bestScore) {
      bestScore = score;
      bestParagraph = para.trim();
    }
  }

  if (bestParagraph.length <= maxLength) return bestParagraph;
  return truncateAtBoundary(bestParagraph, maxLength);
}

/** 창(maxLength − 표식) 안 마지막 문장 경계에서 자르고, 없으면 어절 경계, 그마저 없으면 하드컷한다 */
function truncateAtBoundary(text: string, maxLength: number): string {
  const window = text.slice(0, Math.max(0, maxLength - ELLIPSIS.length));
  const minCut = Math.floor(window.length * MIN_CUT_RATIO);

  let sentenceEnd = -1;
  for (const match of window.matchAll(/[.!?](?=\s)/g))
    sentenceEnd = (match.index ?? -2) + 1;
  if (sentenceEnd >= minCut) return window.slice(0, sentenceEnd) + ELLIPSIS;

  const wordEnd = window.search(/\s\S*$/);
  if (wordEnd >= minCut) return window.slice(0, wordEnd).trimEnd() + ELLIPSIS;

  return window.trimEnd() + ELLIPSIS;
}
