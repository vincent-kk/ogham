/** Join a base URL with an API endpoint path */
export function joinUrl(baseUrl: string, endpoint: string): string {
  const base = baseUrl.replace(/\/+$/, '');
  const path = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
  return base + path;
}

/** Build URL with query parameters */
export function buildUrl(
  baseUrl: string,
  endpoint: string,
  queryParams?: Record<string, string>,
): string {
  const url = new URL(joinUrl(baseUrl, endpoint));
  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

/** Extract hostname from a URL string */
export function extractHostname(url: string): string {
  return new URL(url).hostname;
}
