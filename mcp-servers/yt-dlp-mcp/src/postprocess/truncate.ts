/** Drops a trailing unpaired high surrogate left by slicing mid-emoji. */
function trimLoneSurrogate(s: string): string {
  const last = s.charCodeAt(s.length - 1);
  return last >= 0xd800 && last <= 0xdbff ? s.slice(0, -1) : s;
}

/** Truncates to `limit` chars, appending a notice when content was cut. */
export function truncate(
  text: string,
  limit: number,
  notice = '\n\n… [truncated]',
): string {
  if (text.length <= limit) return text;
  if (notice.length >= limit) return trimLoneSurrogate(text.slice(0, limit));
  const keep = limit - notice.length;
  return trimLoneSurrogate(text.slice(0, keep)) + notice;
}
