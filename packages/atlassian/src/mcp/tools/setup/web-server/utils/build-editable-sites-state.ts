import type { AtlassianConfig, ServiceCredentials } from '../../../../../types/index.js';

export function buildEditableSitesState(
  sites: AtlassianConfig['jira'] | undefined,
  credentials: ServiceCredentials | undefined,
) {
  if (!sites || sites.length === 0) return undefined;

  return sites.map((site) => ({
    base_url: site.base_url,
    is_cloud: site.is_cloud,
    username: site.username,
    ssl_verify: site.ssl_verify,
    timeout: site.timeout,
    api_version_override: site.api_version_override,
    api_token: credentials?.basic?.api_token ? true : undefined,
  }));
}
