/**
 * @file parseDocument.ts
 * @description 마크다운 문자열을 파싱하여 ParsedDocument를 반환한다.
 */
import type { ParsedDocument } from '../types/types.js';

import { extractFrontmatter } from './extractFrontmatter.js';
import { extractLinks } from './extractLinks.js';

/**
 * @param relativePath - vault 루트 기준 상대 경로
 * @param content - 마크다운 내용
 * @param mtime - 파일 수정 시간
 * @returns 파싱된 문서
 */
export function parseDocument(
  relativePath: string,
  content: string,
  mtime: number,
): ParsedDocument {
  const { frontmatter, body } = extractFrontmatter(content);
  const links = extractLinks(body);

  return {
    relativePath,
    frontmatter,
    body,
    links,
    mtime,
  };
}
