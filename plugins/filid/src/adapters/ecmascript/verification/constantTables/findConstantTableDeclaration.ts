import type { LexicalToken } from '../../structure/scanLexicalTokens.js';

export interface ConstantTableDeclaration {
  nameIndex: number;
  arrayStart: number;
  arrayEnd: number;
}

/** Find a preceding, unexported top-level const initialized by one array. */
export function findConstantTableDeclaration(
  tokens: readonly LexicalToken[],
  name: string,
  referenceIndex: number,
): ConstantTableDeclaration | undefined {
  const declarationIndex = tokens.findIndex(
    (token, index) =>
      index < referenceIndex &&
      token.kind === 'identifier' &&
      token.value === 'const' &&
      token.parenDepth === 0 &&
      token.braceDepth === 0 &&
      token.bracketDepth === 0 &&
      tokens[index - 1]?.value !== 'export' &&
      tokens[index + 1]?.kind === 'identifier' &&
      tokens[index + 1]?.value === name &&
      tokens[index + 2]?.value === '=' &&
      tokens[index + 3]?.kind === 'punctuation' &&
      tokens[index + 3]?.value === '[',
  );
  if (declarationIndex < 0) return undefined;
  const arrayStart = declarationIndex + 3;
  const arrayEnd = tokens.findIndex(
    (token, index) =>
      index > arrayStart &&
      token.kind === 'punctuation' &&
      token.value === ']' &&
      token.bracketDepth === 1 &&
      token.parenDepth === 0 &&
      token.braceDepth === 0,
  );
  if (arrayEnd < 0 || arrayEnd >= referenceIndex) return undefined;
  let end = arrayEnd + 1;
  if (tokens[end]?.value === 'as' && tokens[end + 1]?.value === 'const')
    end += 2;
  if (tokens[end]?.value !== ';') return undefined;
  return { nameIndex: declarationIndex + 1, arrayStart, arrayEnd };
}
