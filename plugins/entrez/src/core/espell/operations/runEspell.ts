import type { EspellResult } from "../../../types/search.js";

/**
 * ESpell adapter seam. The tool injects an ESpell-backed implementation that
 * returns the corrected query string (which may equal the input or be empty);
 * this module stays free of any HTTP client and remains testable.
 */
export type EspellFn = (term: string) => Promise<string>;

/**
 * Resolve an ESpell correction for a term. A correction counts only when the
 * adapter returns a non-blank string that differs from the original input.
 */
export async function runEspell(
  term: string,
  espellFn: EspellFn,
): Promise<EspellResult> {
  const corrected = await espellFn(term);
  const hasCorrection = corrected.trim().length > 0 && corrected !== term;
  return {
    original: term,
    corrected: hasCorrection ? corrected : undefined,
    hasCorrection,
  };
}
