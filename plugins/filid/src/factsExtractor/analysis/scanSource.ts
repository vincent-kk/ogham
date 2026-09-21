import { findUntrustedText } from './lexing/findUntrustedText.js';
import type { UntrustedText } from './lexing/findUntrustedText.js';
import type { LexicalToken } from './lexing/lexicalToken.js';
import { scanLexicalTokens } from './lexing/scanLexicalTokens.js';

/** One file's text with the single scan every reading of it shares. */
export interface ScannedSource {
  /** The text the scan was taken over; every reading quotes these bytes. */
  source: string;
  /** Tokens of `source`, in source order. */
  tokens: readonly LexicalToken[];
  /** Spans the scan could not confirm as code, derived from those tokens. */
  untrusted: UntrustedText;
}

/**
 * Scan one file's text once, for every reading that follows.
 *
 * References, the entry surface and the case count each ask the same questions
 * of the same tokens. Scanning per reading made a file's own text the unit of
 * repeated work — four scans for one extraction — so the scan is taken here
 * and passed to each reading instead.
 *
 * @param source - The file's text.
 * @returns The text, its tokens and the spans the scan could not confirm.
 */
export function scanSource(source: string): ScannedSource {
  const tokens = scanLexicalTokens(source);
  return { source, tokens, untrusted: findUntrustedText(source, tokens) };
}
