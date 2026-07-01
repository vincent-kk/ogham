/**
 * Wire body format.
 * - `adf`: Jira Cloud v3 — `{ type: 'doc', ... }` ADF document.
 * - `wiki`: Jira Server/DC v2 — wiki markup string.
 * - `storage-v1`: Confluence Cloud V1 / DC — `{ storage: { value, representation } }` (legacy shape).
 * - `storage-v2`: Confluence Cloud V2 — `{ representation, value }` (flat shape).
 */
export type BodyFormat = "adf" | "wiki" | "storage-v1" | "storage-v2";

/** Decide the wire body format from the resolved service + API version. */
export function pickBodyFormat(
  service: "jira" | "confluence",
  apiVersion: "2" | "3" | "v1" | "v2",
): BodyFormat {
  if (service === "confluence")
    return apiVersion === "v2" ? "storage-v2" : "storage-v1";
  return apiVersion === "3" ? "adf" : "wiki";
}
