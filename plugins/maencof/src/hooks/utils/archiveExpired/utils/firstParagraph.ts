/**
 * @file firstParagraph.ts
 * @description 본문 첫 문단(H1 제외)을 잘라 거친 요약으로 쓴다. LLM 증류가 아닌 기계적 추출.
 */
const SUMMARY_MAX_LENGTH = 300;

export function firstParagraph(body: string): string {
  const bodyWithoutHeading = body.replace(/^#\s+.+$/m, '').trim();
  const paragraph = bodyWithoutHeading
    .split(/\n\s*\n/)
    .map((candidate) => candidate.trim())
    .find((candidate) => candidate.length > 0);
  if (!paragraph) return '';
  return paragraph.length > SUMMARY_MAX_LENGTH
    ? `${paragraph.slice(0, SUMMARY_MAX_LENGTH)}…`
    : paragraph;
}
