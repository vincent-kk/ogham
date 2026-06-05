import { CLOUD_HOSTNAME_PATTERN } from "../../constants/index.js";
import { extractHostname } from "../../utils/index.js";

export interface EnvironmentInfo {
  is_cloud: boolean;
  base_url: string;
  hostname: string;
}

/** Detect whether a URL points to Atlassian Cloud or Server/DC */
export function resolveEnvironment(baseUrl: string): EnvironmentInfo {
  const hostname = extractHostname(baseUrl);
  const is_cloud = CLOUD_HOSTNAME_PATTERN.test(hostname);
  const base_url = baseUrl.replace(/\/+$/, "");

  return { is_cloud, base_url, hostname };
}

/**
 * Resolve API version per service.
 * - Jira: `'2' | '3'`, with `override` allowed (on-prem v2/v3 toggle).
 * - Confluence: `'v1' | 'v2'`, `override` ignored (DC v1 is the single on-prem standard).
 */
export function getApiVersion(
  service: "jira" | "confluence",
  is_cloud: boolean,
  override?: "2" | "3",
): "2" | "3" | "v1" | "v2" {
  if (service === "jira") {
    if (override) return override;
    return is_cloud ? "3" : "2";
  }
  return is_cloud ? "v2" : "v1";
}
