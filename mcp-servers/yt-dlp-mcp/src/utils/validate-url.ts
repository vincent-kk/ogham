/**
 * True only for absolute http(s) URLs. yt-dlp accepts many sites, so this is a
 * scheme/shape guard, not a YouTube-specific check.
 */
export function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
