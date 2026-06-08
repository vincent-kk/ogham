// Safe coercion from untrusted yt-dlp JSON at the trust boundary (ARCHITECTURE §10).

export function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((x): x is string => typeof x === 'string');
}
