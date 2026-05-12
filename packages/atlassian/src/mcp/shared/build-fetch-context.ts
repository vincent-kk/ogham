import type { FetchContext, HttpClientConfig } from '../../types/index.js';
import { loadConfig } from '../../core/config-manager/index.js';
import { getAuthHeader } from '../../core/auth-manager/index.js';
import { resolveSiteConfig } from '../../utils/index.js';

/** Build FetchContext (HttpClientConfig + service + apiVersion) for a fetch call. */
export async function buildFetchContext(
  service: 'jira' | 'confluence',
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

  const apiVersion: '2' | '3' =
    service === 'jira'
      ? (siteConfig.api_version_override ?? (siteConfig.is_cloud ? '3' : '2'))
      : siteConfig.is_cloud
        ? '3'
        : '2';

  return { http, service, apiVersion };
}
