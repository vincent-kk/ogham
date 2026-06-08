// Safe coercion from untrusted yt-dlp JSON at the trust boundary (ARCHITECTURE §10).

export function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
}
