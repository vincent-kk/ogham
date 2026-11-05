import type { FetchContext, HttpClientConfig } from "../../../types/index.js";
import { loadConfig } from "../../../core/configManager/index.js";
import { getAuthHeader } from "../../../core/authManager/index.js";
import { getApiVersion } from "../../../core/index.js";
import { resolveSiteConfig } from "../../../utils/index.js";

/**
 * Assemble an API context with an auth header readable by HTTP but omitted by JSON/spread.
 * @param service Configured Atlassian service to call.
 * @param baseUrl Optional site selector when multiple sites are configured.
 * @param endpoint Optional endpoint used to resolve the target site.
 * @returns The context, or null when no sites exist; configuration and site-resolution errors propagate.
 */
export async function buildFetchContext(
  service: "jira" | "confluence",
  baseUrl?: string,
  endpoint?: string,
): Promise<FetchContext | null> {
  const config = await loadConfig();
  const sites = config[service];
  // Validate storage before site-selection errors can hide the setup instruction.
  await getAuthHeader(service);
  if (!sites?.length) return null;

  const siteConfig = resolveSiteConfig(service, sites, baseUrl, endpoint);
  const authHeader = await getAuthHeader(service, siteConfig.username);

  const http: HttpClientConfig = {
    base_url: siteConfig.base_url,
    auth_header: authHeader ?? undefined,
    ssl_verify: siteConfig.ssl_verify,
    timeout: siteConfig.timeout,
    allow_private_ip: !siteConfig.is_cloud,
  };
  Object.defineProperty(http, "auth_header", { enumerable: false });

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
    is_cloud: siteConfig.is_cloud,
  };
}
