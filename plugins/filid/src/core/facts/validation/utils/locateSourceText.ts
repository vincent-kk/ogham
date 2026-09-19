import { splitSourceLines } from './splitSourceLines.js';

/**
 * Whether a reported string, split into its lines, sits at one line of a file.
 *
 * @param lines - File contents split into lines, in order.
 * @param start - 0-based index of the line the string would begin on.
 * @param parts - The reported string split into lines; at least one entry.
 * @returns True when a single part is inside the line, or when the first part
 * ends the line, every middle part is a whole line and the last part starts one.
 */
function spansFrom(
  lines: readonly string[],
  start: number,
  parts: readonly string[],
): boolean {
  if (parts.length === 1) return lines[start].includes(parts[0]);
  const last = parts.length - 1;
  return (
    lines[start].endsWith(parts[0]) &&
    lines[start + last].startsWith(parts[last]) &&
    parts.slice(1, last).every((part, at) => lines[start + at + 1] === part)
  );
}

/**
 * Every line of a file at which a literal string begins.
 *
 * Plain substring containment is the whole check: filid does not parse the
 * source, so "the provider says this byte sequence is in the file" is the
 * strongest claim it can verify (spec §4.2, P1). A string that holds a line
 * break — a specifier crossing a line continuation — is matched over
 * consecutive lines, with its breaks normalized the way the file's are.
 *
 * @param lines - File contents split by `splitSourceLines`, in order.
 * @param needle - `sourceText ?? specifier` as the provider reported it.
 * @returns 1-based numbers of the lines the string begins on, ascending; empty when the string is absent.
 */
export function locateSourceText(
  lines: readonly string[],
  needle: string,
): number[] {
  const parts = splitSourceLines(needle);
  const found: number[] = [];
  for (let start = 0; start + parts.length <= lines.length; start += 1)
    if (spansFrom(lines, start, parts)) found.push(start + 1);
  return found;
}
