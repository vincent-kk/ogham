import { CLOUD_HOSTNAME_PATTERN } from '../../constants/index.js';
import { extractHostname } from '../../utils/index.js';

export interface EnvironmentInfo {
  is_cloud: boolean;
  base_url: string;
  hostname: string;
}

/** Detect whether a URL points to Atlassian Cloud or Server/DC */
export function resolveEnvironment(baseUrl: string): EnvironmentInfo {
  const hostname = extractHostname(baseUrl);
  const is_cloud = CLOUD_HOSTNAME_PATTERN.test(hostname);
  const base_url = baseUrl.replace(/\/+$/, '');

  return { is_cloud, base_url, hostname };
}

/** Get the correct API version prefix. `override` takes precedence over `is_cloud` (Jira on-prem only). */
export function getApiVersion(is_cloud: boolean, override?: '2' | '3'): string {
  if (override) return override;
  return is_cloud ? '3' : '2';
}
