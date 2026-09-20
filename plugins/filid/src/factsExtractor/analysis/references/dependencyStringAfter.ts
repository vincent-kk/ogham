import type { LexicalToken } from '../lexing/lexicalToken.js';

/**
 * Find the specifier string of the declaration that starts at `start`.
 * @param tokens - Tokens of the scanned text
 * @param start - Index just past the `import`, `from` or `require` token
 * @returns The first string token before the statement ends, or null when a
 * `;` or a top-level `import`/`export` comes first
 */
export function dependencyStringAfter(
  tokens: readonly LexicalToken[],
  start: number,
): LexicalToken | null {
  for (let index = start; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.kind === 'string') return token;
    if (
      token.value === ';' ||
      (token.braceDepth === 0 &&
        token.kind === 'identifier' &&
        (token.value === 'import' || token.value === 'export'))
    )
      return null;
  }
  return null;
}
