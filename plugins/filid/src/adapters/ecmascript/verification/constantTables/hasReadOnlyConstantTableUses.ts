import type { LexicalToken } from '../../structure/scanLexicalTokens.js';

import type { ConstantTableDeclaration } from './findConstantTableDeclaration.js';
import { isEachTableArgument } from './isEachTableArgument.js';
import { isReadOnlyMapCall } from './isReadOnlyMapCall.js';

function isForOfValue(tokens: readonly LexicalToken[], index: number): boolean {
  return (
    tokens[index - 5]?.value === 'for' &&
    tokens[index - 4]?.value === '(' &&
    tokens[index - 3]?.value === 'const' &&
    tokens[index - 2]?.kind === 'identifier' &&
    tokens[index - 1]?.value === 'of' &&
    tokens[index + 1]?.value === ')'
  );
}

/** Reject every binding use that can change, expose, or obscure the table. */
export function hasReadOnlyConstantTableUses(
  tokens: readonly LexicalToken[],
  declaration: ConstantTableDeclaration,
  tableApis: ReadonlySet<string>,
): boolean {
  if (
    tokens.some(
      (token) =>
        token.kind === 'identifier' &&
        (token.value === 'eval' || token.value === 'Function'),
    )
  )
    return false;
  const name = tokens[declaration.nameIndex].value;
  return tokens.every((token, index) => {
    if (token.kind !== 'identifier' || token.value !== name) return true;
    if (index === declaration.nameIndex) return true;
    if (index <= declaration.arrayEnd) return false;
    return (
      isEachTableArgument(tokens, index, tableApis) ||
      isForOfValue(tokens, index) ||
      isReadOnlyMapCall(tokens, index)
    );
  });
}
