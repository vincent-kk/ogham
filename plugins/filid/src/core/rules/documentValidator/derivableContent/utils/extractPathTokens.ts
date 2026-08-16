import { PATH_TOKEN_PATTERN } from '../../../../../constants/documentValidation.js';

/**
 * Collect the distinct path-shaped code-span tokens in a text: backticked
 * names that contain a separator or end with a known extension. Globs and
 * scoped package names are not paths and are skipped.
 */
export function extractPathTokens(text: string): string[] {
  const tokens = new Set<string>();
  for (const match of text.matchAll(PATH_TOKEN_PATTERN)) {
    const token = match[1].trim();
    if (token.includes('*') || token.startsWith('@')) continue;
    tokens.add(token.replace(/\/$/, ''));
  }
  return [...tokens];
}
