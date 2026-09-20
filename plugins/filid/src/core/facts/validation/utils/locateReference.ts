import type { FactsReference } from '../../schema/fileFactsSchema.js';

import { locateSourceText } from './locateSourceText.js';

/** Delimiters a bare specifier must be wrapped in to count as a reference. */
const QUOTES = ["'", '"', '`'] as const;

/**
 * Every line where one reference stands as a reference, not as a substring.
 *
 * A record that carries `sourceText` already quotes the source exactly, so the
 * text is looked for as it is. A bare specifier is looked for delimited, and
 * that narrowness is the whole point: plain containment would let `'e'` account
 * for every line in a file, and it lets a rewritten specifier be found inside
 * its own replacement — `'../c/index.js'` sits inside `'../../c/index.js'`, so
 * a restructure that moved a unit up would look like a reference nobody claims.
 *
 * Matching only, never parsing: filid does not read syntax (P1), and "this
 * delimited byte sequence is on this line" is the strongest claim it can make.
 *
 * @param lines - File contents split by `splitSourceLines`, in order.
 * @param reference - The reference as a record spells it.
 * @returns 1-based line numbers the reference begins on, ascending.
 */
export function locateReference(
  lines: readonly string[],
  reference: Pick<FactsReference, 'specifier' | 'sourceText'>,
): number[] {
  if (reference.sourceText !== undefined)
    return locateSourceText(lines, reference.sourceText);
  return [
    ...new Set(
      QUOTES.flatMap((quote) =>
        locateSourceText(lines, `${quote}${reference.specifier}${quote}`),
      ),
    ),
  ].sort((left, right) => left - right);
}
