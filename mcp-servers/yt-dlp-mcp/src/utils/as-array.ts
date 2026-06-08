// Safe coercion from untrusted yt-dlp JSON at the trust boundary (ARCHITECTURE §10).

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
