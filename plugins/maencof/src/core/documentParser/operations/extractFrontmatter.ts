/**
 * @file extractFrontmatter.ts
 * @description 마크다운 문자열에서 Frontmatter를 추출하고 Zod로 검증한다.
 */
import { FRONTMATTER_REGEX } from '../../../constants/regexes.js';
import { validateFrontmatter } from '../../../types/frontmatter.js';
import type { FrontmatterParseResult } from '../../../types/frontmatter.js';
import { parseYamlFrontmatter } from '../../yamlParser/index.js';

/**
 * @param content - 마크다운 전체 내용
 * @returns Frontmatter 파싱 결과 + 본문
 */
export function extractFrontmatter(content: string): {
  frontmatter: FrontmatterParseResult;
  body: string;
} {
  const match = FRONTMATTER_REGEX.exec(content);

  if (!match)
    return {
      frontmatter: {
        success: false,
        errors: ['Frontmatter block not found (--- delimiter required)'],
        raw: '',
      },
      body: content,
    };

  const raw = match[1];
  const body = content.slice(match[0].length);

  const parsed = parseYamlFrontmatter(raw);
  const validation = validateFrontmatter(parsed);

  if (!validation.ok)
    return {
      frontmatter: { success: false, errors: validation.errors, raw },
      body,
    };

  return {
    frontmatter: { success: true, data: validation.data, raw },
    body,
  };
}
