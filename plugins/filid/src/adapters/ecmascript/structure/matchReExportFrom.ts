import type { LexicalToken } from './scanLexicalTokens.js';

function isFromKeyword(token: LexicalToken | undefined): boolean {
  return token?.kind === 'identifier' && token.value === 'from';
}

// A re-export names its source only right after its clause closes:
// `export {…} from` or `export * [as ns] from`, each optionally
// `type`-prefixed. Accepting any later `from` token instead would match
// unrelated identifiers — e.g. a parameter named `from` in an exported
// function — and the next string literal would become a phantom
// dependency that turns the whole graph indeterminate.
export function matchReExportFrom(
  tokens: readonly LexicalToken[],
  exportIndex: number,
): number {
  const afterExport = tokens[exportIndex + 1];
  const clauseStart =
    afterExport?.kind === 'identifier' && afterExport.value === 'type'
      ? exportIndex + 2
      : exportIndex + 1;
  const opener = tokens[clauseStart];
  if (opener?.kind !== 'punctuation') return -1;
  if (opener.value === '*') {
    const next = tokens[clauseStart + 1];
    if (isFromKeyword(next)) return clauseStart + 1;
    const aliased = next?.kind === 'identifier' && next.value === 'as';
    return aliased && isFromKeyword(tokens[clauseStart + 3])
      ? clauseStart + 3
      : -1;
  }
  if (opener.value !== '{') return -1;
  for (let index = clauseStart + 1; index < tokens.length; index += 1) {
    const candidate = tokens[index];
    if (candidate.kind === 'punctuation' && candidate.value === '}')
      return isFromKeyword(tokens[index + 1]) ? index + 1 : -1;
  }
  return -1;
}
