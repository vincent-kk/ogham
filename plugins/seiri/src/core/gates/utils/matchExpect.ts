/**
 * Match a literal EXPECT marker against individual observable output lines.
 *
 * @param expect Optional case-sensitive substring, trimmed before matching.
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
  const line = lines.find((candidate) => candidate.includes(expected));
  return line === undefined ? { matched: false } : { matched: true, line };
}
