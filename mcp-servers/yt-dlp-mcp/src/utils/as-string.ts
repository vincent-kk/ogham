// Safe coercion from untrusted yt-dlp JSON at the trust boundary (ARCHITECTURE §10).

export function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}
