/**
 * @file extractGist.ts
 * @description Read and normalize the L1 `gist` field, trimmed and capped to a code-point budget.
 */
import { FRONTMATTER_REGEX } from '../../constants/regexes.js';
import { parseYamlFrontmatter } from '../yamlParser/yamlParser.js';

/**
 * 원시 gist 문자열을 trim + maxChars(코드포인트) 로 캡한다. 공백-only 는 null.
 * 코드포인트 단위 슬라이스로 surrogate pair 를 쪼개지 않는다.
 */
export function capGist(raw: string, maxChars: number): string | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;

  const points = [...trimmed];
  return points.length > maxChars
    ? points.slice(0, maxChars).join('')
    : trimmed;
}

/**
 * frontmatter 의 `gist` 스칼라를 capGist 로 정규화해 반환한다.
 * frontmatter/gist 부재·비문자열·공백-only 는 null — 호출부가 fallback 한다.
 */
export function extractGist(content: string, maxChars: number): string | null {
  const match = FRONTMATTER_REGEX.exec(content);
  if (!match) return null;

  const gist = parseYamlFrontmatter(match[1]).gist;
  if (typeof gist !== 'string') return null;

  return capGist(gist, maxChars);
}
