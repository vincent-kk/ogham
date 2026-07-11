/**
 * @file extractWikiLinkLines.ts
 * @description 본문의 모든 [[wikiLink]]를 원문 그대로 중복 없이 리스트 라인으로 보존한다.
 */
const WIKI_LINK_REGEX = /\[\[([^\]]+)\]\]/g;

export function extractWikiLinkLines(body: string): string[] {
  const seenWikiLinks = new Set<string>();
  const wikiLinkLines: string[] = [];
  WIKI_LINK_REGEX.lastIndex = 0;
  let wikiLinkMatch: RegExpExecArray | null;
  while ((wikiLinkMatch = WIKI_LINK_REGEX.exec(body)) !== null) {
    const wikiLinkTarget = wikiLinkMatch[1].trim();
    if (!wikiLinkTarget || seenWikiLinks.has(wikiLinkTarget)) continue;
    seenWikiLinks.add(wikiLinkTarget);
    wikiLinkLines.push(`- [[${wikiLinkTarget}]]`);
  }
  return wikiLinkLines;
}
