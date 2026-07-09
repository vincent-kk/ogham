/**
 * @file extractBestSnippet.ts
 * @description 문서 내용에서 쿼리 키워드와 가장 관련 높은 단락을 추출한다.
 */

/**
 * @param content - 마크다운 문서 전체 내용
 * @param queryTerms - 검색 키워드 목록
 * @param maxLength - 최대 반환 길이 (기본: 300)
 * @returns 가장 관련성 높은 단락 (truncated)
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

  if (bestParagraph.length > maxLength)
    return bestParagraph.slice(0, maxLength);

  return bestParagraph;
}
