/**
 * Every line of a file that contains a literal string.
 *
 * Plain substring containment is the whole check: filid does not parse the
 * source, so "the provider says this byte sequence is in the file" is the
 * strongest claim it can verify (spec §4.2, P1).
 *
 * @param lines - File contents split on newlines, in order.
 * @param needle - `sourceText ?? specifier` as the provider reported it.
 * @returns 1-based line numbers, ascending; empty when the string is absent.
 */
export function locateSourceText(
  lines: readonly string[],
  needle: string,
): number[] {
  const found: number[] = [];
  for (const [index, line] of lines.entries())
    if (line.includes(needle)) found.push(index + 1);
  return found;
}
