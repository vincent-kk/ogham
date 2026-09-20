import {
  FACTS_REFERENCE_FALLBACK_PATTERN,
  FACTS_REFERENCE_LINE_PATTERNS,
} from '../../../constants/facts.js';
import type { FileFacts } from '../schema/fileFactsSchema.js';
import { locateReference } from '../validation/utils/locateReference.js';

/**
 * The lines an attested record leaves unexplained (spec §4.6).
 *
 * The operation is one boolean per line — does any reference pattern match —
 * and nothing more: no tokens, no syntax, no interpretation (P1). A matching
 * line is explained either by a reference that quotes it, or by a
 * `nonReferences` entry naming it; anything left is what the caller has to read
 * and account for.
 *
 * "Quotes it" is `locateReference`, the same narrow rule the side table uses to
 * decide whether a walked-back specifier is still on a line: a bare specifier
 * has to appear delimited, because plain containment would let a one-character
 * specifier account for every line in the file at once.
 *
 * Line numbers rather than a count, because a count leaves the caller guessing
 * which line to explain and repeating the same refusal — the loop spec §4.6
 * names explicitly.
 *
 * @param lines - The file's current contents split into lines, in order.
 * @param facts - The attested record, after its references were validated.
 * @returns 1-based line numbers, ascending; empty when the record accounts for
 * every matching line.
 */
export function findUnaccountedLines(
  lines: readonly string[],
  facts: FileFacts,
): number[] {
  const explained = new Set(
    (facts.nonReferences ?? []).map((entry) => entry.line),
  );
  const unaccounted: number[] = [];
  for (const [index, line] of lines.entries()) {
    if (explained.has(index + 1) || !looksLikeReference(line)) continue;
    if (
      facts.references.some(
        (reference) => locateReference([line], reference).length > 0,
      )
    )
      continue;
    unaccounted.push(index + 1);
  }
  return unaccounted;
}

/**
 * Whether one line owes an explanation.
 * @param line The line's text.
 * @returns True when any configured reference pattern matches it.
 */
function looksLikeReference(line: string): boolean {
  return (
    FACTS_REFERENCE_FALLBACK_PATTERN.test(line) ||
    FACTS_REFERENCE_LINE_PATTERNS.some((pattern) => pattern.test(line))
  );
}
