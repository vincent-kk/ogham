import type { LexicalToken } from './lexing/lexicalToken.js';
import { scanTokenRange } from './lexing/scanTokenRange.js';

/**
 * Scan ECMAScript source into lexical tokens.
 *
 * A first-line shebang (`#!…`) is skipped: it is not code, and the `/` of
 * `#!/usr/bin/env` would open a regex literal.
 * @param source - Full source text
 * @returns Tokens in source order; strings and templates the source never
 * closes carry `unterminated: true`
 */
export function scanLexicalTokens(source: string): LexicalToken[] {
  const lineEnd = source.indexOf('\n');
  const start = !source.startsWith('#!')
    ? 0
    : lineEnd < 0
      ? source.length
      : lineEnd;
  return scanTokenRange(source, start, false).tokens;
}
