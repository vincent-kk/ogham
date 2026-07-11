/**
 * @file parseMinimalFrontmatter.ts
 * @description frontmatter를 경량 파싱한다 (zod 없이 필요 필드만 줄 단위 추출).
 */
import { stripSurroundingQuotes } from './stripSurroundingQuotes.js';

/** 경량 파싱된 frontmatter (hook에 필요한 필드만) */
export interface MinimalFrontmatter {
  created?: string;
  title?: string;
  /** tags 라인의 원본 값 (inline `[a, b]` 형태 그대로 보존) */
  rawTagsValue?: string;
  expires?: string;
  archived: boolean;
}

const FRONTMATTER_REGEX = /^---\n([\s\S]*?)\n---\n?/;

export function parseMinimalFrontmatter(content: string): {
  frontmatter: MinimalFrontmatter;
  body: string;
} {
  const frontmatterMatch = FRONTMATTER_REGEX.exec(content);
  if (!frontmatterMatch)
    return { frontmatter: { archived: false }, body: content };

  const rawFrontmatter = frontmatterMatch[1];
  const body = content.slice(frontmatterMatch[0].length);
  const frontmatter: MinimalFrontmatter = { archived: false };

  for (const line of rawFrontmatter.split('\n')) {
    const keyValueMatch = /^([A-Za-z_]+):\s*(.*)$/.exec(line.trim());
    if (!keyValueMatch) continue;
    const key = keyValueMatch[1];
    const value = keyValueMatch[2];
    if (key === 'created') frontmatter.created = stripSurroundingQuotes(value);
    else if (key === 'title') frontmatter.title = stripSurroundingQuotes(value);
    else if (key === 'expires')
      frontmatter.expires = stripSurroundingQuotes(value);
    else if (key === 'tags') frontmatter.rawTagsValue = value.trim();
    else if (key === 'archived') frontmatter.archived = value.trim() === 'true';
  }
  return { frontmatter, body };
}
