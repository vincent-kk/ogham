/**
 * Escape a project-relative path before inserting it into a regular expression.
 * @param value Literal normalized path supplied by changed-scope evidence.
 * @returns Regex-safe text that preserves every path character.
 */
function escapeRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

/**
 * Check whether a project-wide finding names a changed file or owner path.
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
      new RegExp(
        `(^|[\\s"'\`(])${escapeRegularExpression(path)}($|[\\s"'\`),/])`,
        'u',
      ).test(message),
  );
}
