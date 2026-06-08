/** Truncates to `limit` chars, appending a notice when content was cut. */
export function truncate(
  text: string,
  limit: number,
  notice = '\n\n… [truncated]',
): string {
  if (text.length <= limit) return text;
  const keep = Math.max(0, limit - notice.length);
  return text.slice(0, keep) + notice;
}
