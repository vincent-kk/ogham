import type { LexicalToken } from '../../structure/scanLexicalTokens.js';

import { findConstantTableDeclaration } from './findConstantTableDeclaration.js';
import { hasReadOnlyConstantTableUses } from './hasReadOnlyConstantTableUses.js';
import { isEachTableArgument } from './isEachTableArgument.js';

/** Resolve a bounded constant reference to the existing literal row counter. */
export function resolveConstantTable(
  tokens: readonly LexicalToken[],
  referenceIndex: number,
  tableApis: ReadonlySet<string>,
): number | undefined {
  const token = tokens[referenceIndex];
  if (token?.kind !== 'identifier') return undefined;
  if (!isEachTableArgument(tokens, referenceIndex, tableApis)) return undefined;
  const declaration = findConstantTableDeclaration(
    tokens,
    token.value,
    referenceIndex,
  );
  if (!declaration) return undefined;
  return hasReadOnlyConstantTableUses(tokens, declaration, tableApis)
    ? declaration.arrayStart
    : undefined;
}
