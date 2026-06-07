/** Returns the last non-empty, trimmed line of multi-line output (e.g. a `--print` result). */
export function lastNonEmptyLine(text: string): string {
  return (
    text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .pop() ?? ''
  );
}
