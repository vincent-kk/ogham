/** CRLF and standalone CR line endings normalized before line-number matching. */
const CARRIAGE_RETURN_NEWLINE_PATTERN = /\r\n?/g;

/**
 * Normalize source text and reviewer excerpts for whitespace-insensitive matching.
 * @param text Source or excerpt text with LF, CRLF, or standalone CR newlines.
 * @returns Trimmed lines, retaining empty lines so source positions remain stable.
 */
export function splitTrimmedReviewLines(text: string): string[] {
  return text
    .replace(CARRIAGE_RETURN_NEWLINE_PATTERN, '\n')
    .split('\n')
    .map((line) => line.trim());
}
