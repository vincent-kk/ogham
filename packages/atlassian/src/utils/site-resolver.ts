import type { ServiceConfig } from '../types/index.js';
import { extractHostname } from './url.js';

/**
 * Resolve a single ServiceConfig from a multi-site array.
 *
 * Priority:
 * 1. Explicit baseUrl parameter → match against sites
 * 2. Absolute URL in endpoint → extract hostname → match
 * 3. Single site in array → auto-select
 * 4. Multiple sites, no disambiguator → error
 */
export function resolveSiteConfig(
  service: 'jira' | 'confluence',
  sites: ServiceConfig[],
  baseUrl?: string,
  endpoint?: string,
): ServiceConfig {
  if (sites.length === 0) {
    throw new Error(`No ${service} sites configured. Run setup first.`);
  }

  // Warn if mixing Cloud and On-Prem under same service (shared credentials may fail)
  const hasCloud = sites.some((s) => s.is_cloud);
  const hasOnPrem = sites.some((s) => !s.is_cloud);
  if (hasCloud && hasOnPrem) {
    console.warn(
      `[atlassian] ${service}: mixing Cloud and On-Prem sites with shared credentials may cause authentication failures.`,
    );
  }

  // 1. Explicit base_url parameter
  if (baseUrl) {
    const match = findSiteByUrl(sites, baseUrl);
    if (match) return match;
    throw new Error(
      `${service} site not found for base_url "${baseUrl}". Registered: ${formatSiteList(sites)}`,
    );
  }

  // 2. Absolute URL in endpoint
  if (endpoint && isAbsoluteUrl(endpoint)) {
    const hostname = extractHostname(endpoint);
    const match = sites.find((s) => extractHostname(s.base_url) === hostname);
    if (match) return match;
    throw new Error(
      `${service} site not found for endpoint hostname "${hostname}". Registered: ${formatSiteList(sites)}`,
    );
  }

  // 3. Single site → auto-select
  if (sites.length === 1) {
    return sites[0];
  }

  // 4. Ambiguous — multiple sites, no disambiguator
  throw new Error(
    `Multiple ${service} sites configured. Specify base_url to select one: ${formatSiteList(sites)}`,
  );
}

function isAbsoluteUrl(s: string): boolean {
  return s.startsWith('https://') || s.startsWith('http://');
}

function findSiteByUrl(sites: ServiceConfig[], url: string): ServiceConfig | undefined {
  const targetHostname = extractHostname(url);
  return sites.find((s) => extractHostname(s.base_url) === targetHostname);
}

function formatSiteList(sites: ServiceConfig[]): string {
  return sites.map((s) => s.base_url).join(', ');
}
