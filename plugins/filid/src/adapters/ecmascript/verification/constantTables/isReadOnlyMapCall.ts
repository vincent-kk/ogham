import type { LexicalToken } from '../../structure/scanLexicalTokens.js';

/** A one-parameter arrow cannot receive map's original array argument. */
export function isReadOnlyMapCall(
  tokens: readonly LexicalToken[],
  index: number,
): boolean {
  if (
    tokens[index + 1]?.value !== '.' ||
    tokens[index + 2]?.value !== 'map' ||
    tokens[index + 3]?.value !== '('
  )
    return false;
  const start = index + 4;
  if (tokens[start]?.kind === 'identifier')
    return tokens[start + 1]?.value === '=>';
  return (
    tokens[start]?.value === '(' &&
    tokens[start + 1]?.kind === 'identifier' &&
    tokens[start + 2]?.value === ')' &&
    tokens[start + 3]?.value === '=>'
  );
}
