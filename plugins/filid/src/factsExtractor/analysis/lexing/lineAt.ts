/**
 * 1-based line number of an offset in source text.
 * @param source - Text `offset` indexes into
 * @param offset - Character offset, e.g. a lexical token's start
 * @returns The line number containing `offset`; the first line is 1
 */
export function lineAt(source: string, offset: number): number {
  let line = 1;
  const end = Math.min(offset, source.length);
  for (let index = 0; index < end; index += 1)
    if (source[index] === '\n') line += 1;
  return line;
}
