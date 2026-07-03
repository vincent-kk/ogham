/**
 * API version prefix per (service, apiVersion) pair.
 *
 * - `jira:2|3`        → `/rest/api/{2|3}`
 * - `confluence:v1`   → `/rest/api`     (Server/DC)
 * - `confluence:v2`   → `/wiki/api/v2`  (Cloud)
 *
 * Confluence Cloud V1 (`/wiki/rest/api/...`) is intentionally not auto-attached —
 * callers can still pass a fully-qualified `/wiki/rest/api/...` path and it is
 * preserved verbatim via the pass-through check below.
 */
const PREFIX_MAP: Record<string, string> = {
  "jira:2": "/rest/api/2",
  "jira:3": "/rest/api/3",
  "confluence:v1": "/rest/api",
  "confluence:v2": "/wiki/api/v2",
};

/**
 * Site-root prefixes that are already physical paths and must never receive
 * an API prefix:
 *
 * - `/wiki/`     — Confluence Cloud context path (REST + download servlet)
 * - `/rest/`     — any REST root (`api`, `agile`, `servicedeskapi`, `dev-status`, …)
 * - `/secure/`   — Jira servlet root (`/secure/attachment/{id}/{filename}`)
 * - `/download/` — Confluence attachment servlet (Server/DC at site root;
 *                  Cloud serves it under `/wiki/` — see rewrite below)
 * - `/plugins/`  — servlet plugin root (`/plugins/servlet/...`)
 */
const PASS_THROUGH_PREFIXES = [
  "/wiki/",
  "/rest/",
  "/secure/",
  "/download/",
  "/plugins/",
];

/**
 * Attach the service+version prefix to a logical endpoint.
 * Endpoints already rooted at a known physical prefix are returned unchanged.
 */
export function attachPrefix(
  endpoint: string,
  service: "jira" | "confluence",
  apiVersion: "2" | "3" | "v1" | "v2",
): string {
  // Confluence Cloud metadata returns context-relative download links
  // (/download/attachments/...) whose servlet lives under /wiki.
  if (
    service === "confluence" &&
    apiVersion === "v2" &&
    endpoint.startsWith("/download/")
  )
    return `/wiki${endpoint}`;

  if (PASS_THROUGH_PREFIXES.some((prefix) => endpoint.startsWith(prefix)))
    return endpoint;

  const prefix = PREFIX_MAP[`${service}:${apiVersion}`];
  if (!prefix) return endpoint;
  const normalized = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${prefix}${normalized}`;
}
