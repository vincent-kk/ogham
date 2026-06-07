/**
 * Count the actual number of lines in a string.
 * Empty string returns 0, trailing newline is ignored.
 */
export function countLines(content: string): number {
  if (content.length === 0) return 0;
  const trimmed = content.endsWith('\n') ? content.slice(0, -1) : content;
  if (trimmed.length === 0) return 0;
  return trimmed.split('\n').length;
}
