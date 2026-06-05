import type { FetchContext, HttpClientConfig } from "../../types/index.js";
import { loadConfig } from "../../core/configManager/index.js";
import { getAuthHeader } from "../../core/authManager/index.js";
import { getApiVersion } from "../../core/index.js";
import { resolveSiteConfig } from "../../utils/index.js";

/** Build FetchContext (HttpClientConfig + service + apiVersion) for a fetch call. */
export async function buildFetchContext(
  service: "jira" | "confluence",
  baseUrl?: string,
  endpoint?: string,
): Promise<FetchContext | null> {
  const config = await loadConfig();
  const sites = config[service];
  if (!sites || sites.length === 0) return null;

  const siteConfig = resolveSiteConfig(service, sites, baseUrl, endpoint);

  const authHeader = await getAuthHeader(service, siteConfig.username);

  const http: HttpClientConfig = {
    base_url: siteConfig.base_url,
    auth_header: authHeader ?? undefined,
    ssl_verify: siteConfig.ssl_verify,
    timeout: siteConfig.timeout,
    allow_private_ip: !siteConfig.is_cloud,
  };

  const apiVersion = getApiVersion(
    service,
    siteConfig.is_cloud,
    siteConfig.api_version_override,
  );

  return {
    http,
    service,
    apiVersion,
    requires_xsrf_bypass: !siteConfig.is_cloud,
  };
}
