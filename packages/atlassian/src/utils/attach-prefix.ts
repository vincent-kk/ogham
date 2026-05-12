/**
 * API version prefix per (service, apiVersion) pair.
 *
 * - `jira:2|3`        → `/rest/api/{2|3}`
 * - `confluence:v1`   → `/rest/api`     (Server/DC)
 * - `confluence:v2`   → `/wiki/api/v2`  (Cloud)
 *
 * Confluence Cloud V1 (`/wiki/rest/api/...`) is intentionally not auto-attached —
 * callers can still pass a fully-qualified `/wiki/rest/api/...` path and it is
 * preserved verbatim via the backward-compat check below.
 */
const PREFIX_MAP: Record<string, string> = {
  'jira:2': '/rest/api/2',
  'jira:3': '/rest/api/3',
  'confluence:v1': '/rest/api',
  'confluence:v2': '/wiki/api/v2',
};

/**
 * Attach the service+version prefix to a logical endpoint.
 * If the endpoint already starts with a known absolute prefix
 * (`/wiki/` or `/rest/api/`), it is returned unchanged.
 */
export function attachPrefix(
  endpoint: string,
  service: 'jira' | 'confluence',
  apiVersion: '2' | '3' | 'v1' | 'v2',
): string {
  if (endpoint.startsWith('/wiki/') || endpoint.startsWith('/rest/api/')) {
    return endpoint;
  }
  const prefix = PREFIX_MAP[`${service}:${apiVersion}`];
  if (!prefix) return endpoint;
  const normalized = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${prefix}${normalized}`;
}
