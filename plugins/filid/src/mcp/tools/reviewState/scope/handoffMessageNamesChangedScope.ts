/**
 * Escape a project-relative path before inserting it into a regular expression.
 * @param value Literal normalized path supplied by changed-scope evidence.
 * @returns Regex-safe text that preserves every path character.
 */
function escapeRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

/**
 * Match an escaped literal path only when its leading edge is string start,
 * whitespace, quote, backtick, or `(` and its trailing edge is string end,
 * whitespace, quote, backtick, `)`, comma, or slash.
 * @param message Finding message used as the only project-wide path evidence.
 * @param paths Changed file and owner paths eligible for segment-boundary matches.
 * @returns Whether one eligible path occurs as a complete message segment.
 */
export function handoffMessageNamesChangedScope(
  message: string,
  paths: readonly (string | null)[],
): boolean {
  return paths.some(
    (path) =>
      path !== null &&
      path !== '.' &&
      new RegExp(
        `(^|[\\s"'\`(])${escapeRegularExpression(path)}($|[\\s"'\`),/])`,
        'u',
      ).test(message),
  );
}
