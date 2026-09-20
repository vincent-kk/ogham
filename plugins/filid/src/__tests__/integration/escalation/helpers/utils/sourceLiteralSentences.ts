import { lineAt } from '../../../../../adapters/ecmascript/structure/lexing/lineAt.js';
import { scanLexicalTokens } from '../../../../../adapters/ecmascript/structure/scanLexicalTokens.js';

import { type LocatedSentence, splitSentences } from './splitSentences.js';
import { staticTemplateText } from './staticTemplateText.js';

/**
 * The sentences of one source file's string and template literals.
 *
 * Literals come from the ECMAScript adapter's lexer, so comments and
 * identifiers never contribute. A literal's sentences carry the line the
 * literal starts on.
 * @param source Source text.
 * @returns Sentences of every string and template literal, in source order.
 */
export function sourceLiteralSentences(source: string): LocatedSentence[] {
  return scanLexicalTokens(source)
    .filter(({ kind }) => kind === 'string' || kind === 'template')
    .flatMap((token) =>
      splitSentences(
        token.kind === 'template'
          ? staticTemplateText(token.value)
          : token.value,
        lineAt(source, token.start),
      ),
    );
}
