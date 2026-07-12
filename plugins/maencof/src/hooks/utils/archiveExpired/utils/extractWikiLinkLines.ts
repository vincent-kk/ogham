/**
 * @file extractWikiLinkLines.ts
 * @description 본문의 [[wikiLink]] 중 그래프 edge 가 되는 것만 원문 그대로 중복 없이 리스트 라인으로 보존한다.
 *              추출 규칙은 정본 파서 extractLinks 와 동일 — 코드 스팬/블록 안의 예시 위키링크는 제외.
 */
import { extractLinks } from '../../../../core/documentParser/operations/extractLinks.js';

export function extractWikiLinkLines(body: string): string[] {
  const seenWikiLinks = new Set<string>();
  const wikiLinkLines: string[] = [];
  for (const link of extractLinks(body)) {
    if (link.kind !== 'wiki' || seenWikiLinks.has(link.text)) continue;
    seenWikiLinks.add(link.text);
    wikiLinkLines.push(`- [[${link.text}]]`);
  }
  return wikiLinkLines;
}
