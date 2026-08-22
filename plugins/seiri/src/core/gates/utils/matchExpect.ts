/** Slash-delimited regular expression with optional flags. */
const REGEX_EXPECT = /^\/(.+)\/([a-z]*)$/;

/**
 * Match an EXPECT value against individual observable output lines.
 *
 * @param expect Optional substring or slash-delimited regular expression.
 * @param text Observable output text.
 * @returns Match state and the first matching line when one is required.
 */
export function matchExpect(
  expect: string | undefined,
  text: string,
): { matched: boolean; line?: string } {
  const expected = expect?.trim();
  if (!expected) return { matched: true };

  const lines = text.split('\n');
  const regexMatch = REGEX_EXPECT.exec(expected);
  if (regexMatch !== null)
    try {
      const pattern = new RegExp(regexMatch[1], regexMatch[2]);
      for (const line of lines) {
        pattern.lastIndex = 0;
        if (pattern.test(line)) return { matched: true, line };
      }
      return { matched: false };
    } catch {
      // An invalid regex remains usable as a literal substring.
    }

  const line = lines.find((candidate) => candidate.includes(expected));
  return line === undefined ? { matched: false } : { matched: true, line };
}
