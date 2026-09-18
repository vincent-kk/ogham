/**
 * Find where a regex literal opened at `start` ends.
 *
 * Escapes and character classes are tracked, so neither `\/` nor `[/]` closes
 * the literal. A regex literal cannot span lines, so reaching a line break
 * means the `/` was division after all.
 * @param source - Full source text
 * @param start - Offset of a `/` standing where an operand is expected
 * @returns Offset just past the closing `/` and its flags, or -1 when the line
 * ends before a closing `/`
 */
export function readRegexLiteral(source: string, start: number): number {
  let inClass = false;
  for (let cursor = start + 1; cursor < source.length; cursor += 1) {
    const character = source[cursor];
    if (character === '\n' || character === '\r') return -1;
    if (character === '\\') {
      const escaped = source[cursor + 1];
      if (escaped === '\n' || escaped === '\r') return -1;
      cursor += 1;
    } else if (character === '[') inClass = true;
    else if (character === ']') inClass = false;
    else if (character === '/' && !inClass) {
      let end = cursor + 1;
      while (end < source.length && /[A-Za-z]/.test(source[end])) end += 1;
      return end;
    }
  }
  return -1;
}
