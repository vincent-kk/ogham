/** Extract the hostname from a URL string. Throws on a malformed URL. */
export function extractHost(url: string): string {
  return new URL(url).hostname;
}
