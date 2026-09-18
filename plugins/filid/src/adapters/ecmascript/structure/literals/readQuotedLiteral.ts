/**
 * Read a `'`, `"` or `` ` `` literal opened at `start`.
 *
 * A `'` or `"` literal ends at an unescaped line break. Reading on to the next
 * matching quote would swap code and string for every line after it.
 * @param source - Full source text
 * @param start - Offset of the opening quote
 * @param quote - The opening quote character
 * @returns `end` just past the closing quote (or where reading stopped), the
 * escape-reduced `value`, whether a template interpolates or never closed
 * (`dynamicTemplate`), and whether the closing quote was found (`terminated`)
 */
export function readQuotedLiteral(
  source: string,
  start: number,
  quote: string,
): {
  end: number;
  value: string;
  dynamicTemplate: boolean;
  terminated: boolean;
} {
  let cursor = start + 1;
  let value = '';
  let dynamicTemplate = false;
  while (cursor < source.length) {
    const character = source[cursor];
    if (character === '\\') {
      const escapeEnd = source.startsWith('\r\n', cursor + 1)
        ? cursor + 3
        : cursor + 2;
      value += source.slice(cursor + 1, escapeEnd);
      cursor = escapeEnd;
      continue;
    }
    if (quote === '`' && character === '$' && source[cursor + 1] === '{')
      dynamicTemplate = true;
    if (character === quote)
      return { end: cursor + 1, value, dynamicTemplate, terminated: true };
    if (quote !== '`' && (character === '\n' || character === '\r'))
      return { end: cursor, value, dynamicTemplate, terminated: false };
    value += character;
    cursor += 1;
  }
  return {
    end: source.length,
    value,
    dynamicTemplate: true,
    terminated: false,
  };
}
