import { PATH_TOKEN_PATTERN } from '../../../../../constants/documentValidation.js';

/** URI scheme or builtin-specifier prefix (`https:`, `node:`) — a locator, not a path. */
const SCHEME_PREFIX = /^[a-z][a-z0-9+.-]*:/;

/**
 * Collect the distinct path-shaped code-span tokens in a text: backticked,
 * whitespace-free spans carrying a `/` separator. Globs, `@`-scoped names,
 * `<placeholder>` templates and scheme-prefixed specifiers are not paths.
 * Tokens keep their written form; spellings that differ only by a trailing
 * `/` collapse into one, preferring the directory-marked spelling whichever
 * order they appear in.
 */
export function extractPathTokens(text: string): string[] {
  const byKey = new Map<string, string>();
  for (const match of text.matchAll(PATH_TOKEN_PATTERN)) {
    const token = match[1];
    if (token.includes('*') || token.startsWith('@')) continue;
    if (/[<>]/.test(token) || SCHEME_PREFIX.test(token)) continue;
    const key = token.replace(/\/+$/, '');
    if (key === '') continue;
    const kept = byKey.get(key);
    if (kept === undefined || (!kept.endsWith('/') && token.endsWith('/')))
      byKey.set(key, token);
  }
  return [...byKey.values()];
}
