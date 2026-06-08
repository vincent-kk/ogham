// Safe coercion from untrusted yt-dlp JSON at the trust boundary (ARCHITECTURE §10).

export function asBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}
