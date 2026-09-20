import { findHiddenMatches } from '../lexing/findHiddenMatches.js';
import { findUntrustedText } from '../lexing/findUntrustedText.js';
import type { LexicalToken } from '../lexing/lexicalToken.js';

/** An `export` keyword as raw text, not preceded by a member dot. */
const HIDDEN_EXPORT_PATTERN = /(?<![\w$.])export\b/g;

/**
 * Whether unterminated literals may hide part of an entry point's surface.
 * @param source - The entry point's text
 * @param tokens - Tokens of `source`
 * @returns True when the scanner lost track, or a raw `export` keyword follows
 * the first quote of a mispaired line or sits in an unterminated template
 */
export function hidesExport(
  source: string,
  tokens: readonly LexicalToken[],
): boolean {
  const untrusted = findUntrustedText(source, tokens);
  return (
    untrusted.lostTrackAt < Number.POSITIVE_INFINITY ||
    findHiddenMatches(
      source,
      untrusted,
      HIDDEN_EXPORT_PATTERN,
      'afterFirstQuote',
    ).length > 0
  );
}
