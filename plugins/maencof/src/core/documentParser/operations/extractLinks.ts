/**
 * @file extractLinks.ts
 * @description 마크다운 본문에서 아웃바운드 링크를 추출한다.
 */
import {
  ABSOLUTE_HREF_REGEX,
  MARKDOWN_LINK_REGEX,
  WIKILINK_REGEX,
} from '../../../constants/regexes.js';
import type { MarkdownLink } from '../types/types.js';

/**
 * @param body - 마크다운 본문
 * @returns 링크 목록
 */
export function extractLinks(body: string): MarkdownLink[] {
  const links: MarkdownLink[] = [];
  let match: RegExpExecArray | null;

  // 코드 블록 제거 후 링크 추출 (코드 블록 내 링크 무시)
  const bodyWithoutCode = body
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '');

  MARKDOWN_LINK_REGEX.lastIndex = 0;
  while ((match = MARKDOWN_LINK_REGEX.exec(bodyWithoutCode)) !== null) {
    const text = match[1];
    const href = match[2].trim();

    // 빈 href 건너뛰기
    if (!href) continue;

    links.push({
      text,
      href,
      isAbsolute: ABSOLUTE_HREF_REGEX.test(href),
    });
  }

  // 위키링크 추출: [[path]], [[path|display]], [[path#heading]], [[path#heading|display]]
  WIKILINK_REGEX.lastIndex = 0;
  while ((match = WIKILINK_REGEX.exec(bodyWithoutCode)) !== null) {
    const raw = match[1].trim();
    if (!raw) continue;

    // display text 분리: [[path|display]] → path
    const withoutDisplay = raw.split('|')[0].trim();
    // heading/block ref 분리: [[path#heading]] → path
    const pathOnly = withoutDisplay.split('#')[0].trim();
    if (!pathOnly) continue;

    // .md 확장자 자동 보정 (Obsidian 컨벤션: 확장자 생략 가능)
    const href = pathOnly.endsWith('.md') ? pathOnly : `${pathOnly}.md`;

    links.push({
      text: raw,
      href,
      isAbsolute: false, // 위키링크는 항상 vault-relative 내부 참조
    });
  }

  return links;
}
