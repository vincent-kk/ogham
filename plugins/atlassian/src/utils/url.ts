/** Join a base URL with an API endpoint path */
export function joinUrl(baseUrl: string, endpoint: string): string {
  const base = baseUrl.replace(/\/+$/, "");
  const path = endpoint.startsWith("/") ? endpoint : "/" + endpoint;
  return base + path;
}

/** Build URL with query parameters */
export function buildUrl(
  baseUrl: string,
  endpoint: string,
  queryParams?: Record<string, string>,
): string {
  const url = new URL(joinUrl(baseUrl, endpoint));
  if (queryParams)
    for (const [key, value] of Object.entries(queryParams))
      url.searchParams.set(key, value);

  return url.toString();
}

/** Extract hostname from a URL string */
export function extractHostname(url: string): string {
  return new URL(url).hostname;
}

/**
 * Reduce an absolute endpoint URL to a base-relative path.
 *
 * - Relative endpoints pass through unchanged.
 * - `baseUrl`-prefixed endpoints are stripped to the remainder
 *   (the context path is restored when the request is re-joined with the base).
 * - Same-host endpoints outside the base prefix fall back to pathname + search.
 * - Endpoints on a different host are rejected.
 */
export function stripBaseUrl(endpoint: string, baseUrl: string): string {
  if (!endpoint.startsWith("http://") && !endpoint.startsWith("https://"))
    return endpoint;

  const base = baseUrl.replace(/\/+$/, "");
  if (endpoint === base) return "/";
  if (endpoint.startsWith(`${base}/`)) return endpoint.slice(base.length);
  if (endpoint.startsWith(`${base}?`)) return `/${endpoint.slice(base.length)}`;

  const target = new URL(endpoint);
  const site = new URL(base);
  if (target.hostname !== site.hostname)
    throw new Error(
      `Endpoint host "${target.hostname}" does not match the resolved site base_url "${baseUrl}". Pass base_url to select the intended site.`,
    );

  // Same host but textual base mismatch (scheme/port/case variance):
  // drop the site's context path so the re-join does not duplicate it.
  const contextPath = site.pathname.replace(/\/+$/, "");
  if (contextPath === "") return target.pathname + target.search;
  if (target.pathname === contextPath) return `/${target.search}`;
  if (target.pathname.startsWith(`${contextPath}/`))
    return target.pathname.slice(contextPath.length) + target.search;
  return target.pathname + target.search;
}

/** Detect Atlassian service type from endpoint path */
export function detectService(endpoint: string): "jira" | "confluence" {
  if (
    endpoint.includes("/wiki/") ||
    endpoint.startsWith("/api/v2/") ||
    endpoint.includes("/download/attachments/")
  )
    return "confluence";
  return "jira";
}
