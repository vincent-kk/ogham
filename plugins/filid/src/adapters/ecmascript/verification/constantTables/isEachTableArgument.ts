import type { LexicalToken } from '../../structure/scanLexicalTokens.js';

/** Accept a whole `.each` argument only for the counter's known case/suite APIs. */
export function isEachTableArgument(
  tokens: readonly LexicalToken[],
  index: number,
  tableApis: ReadonlySet<string>,
): boolean {
  if (tokens[index - 1]?.value !== '(' || tokens[index + 1]?.value !== ')')
    return false;
  let cursor = index - 2;
  if (tokens[cursor]?.value === '>') {
    let depth = 1;
    for (cursor -= 1; cursor >= 0; cursor -= 1) {
      if (tokens[cursor].kind !== 'punctuation') continue;
      if (tokens[cursor].value === '>') depth += 1;
      if (tokens[cursor].value === '<') depth -= 1;
      if (depth === 0) break;
    }
    if (depth !== 0) return false;
    cursor -= 1;
  }
  if (tokens[cursor]?.value !== 'each' || tokens[cursor - 1]?.value !== '.')
    return false;
  cursor -= 2;
  while (
    tokens[cursor - 1]?.value === '.' &&
    tokens[cursor - 2]?.kind === 'identifier'
  )
    cursor -= 2;
  return (
    tokens[cursor]?.kind === 'identifier' &&
    tableApis.has(tokens[cursor].value) &&
    tokens[cursor - 1]?.value !== '.'
  );
}
