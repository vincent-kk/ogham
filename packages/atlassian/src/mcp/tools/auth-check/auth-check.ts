import { loadConfig } from '../../../core/config-manager/index.js';
import { loadCredentials } from '../../../core/auth-manager/index.js';
import { testConnection } from '../../../core/index.js';
import type { AuthCheckResult, AuthCheckServiceEntry } from '../../../types/index.js';

/** Auth-check tool handler — reports auth configuration status and optionally tests connectivity */
export async function handleAuthCheck(params: { connection_test?: boolean }): Promise<AuthCheckResult> {
  const connectionTest = params.connection_test ?? false;

  const config = await loadConfig();

  const services: AuthCheckResult['services'] = {};
  const serviceNames = ['jira', 'confluence'] as const;

  let hasAnyService = false;
  const credentials = connectionTest ? await loadCredentials() : undefined;

  for (const service of serviceNames) {
    const sites = config[service];
    if (!sites || sites.length === 0) continue;

    hasAnyService = true;
    const entries: AuthCheckServiceEntry[] = [];

    for (const siteConfig of sites) {
      const entry: AuthCheckServiceEntry = {
        configured: true,
        base_url: siteConfig.base_url,
      };

      if (connectionTest && credentials) {
        const serviceCredentials = credentials[service] ?? {};

        const result = await testConnection({
          base_url: siteConfig.base_url,
          credentials: serviceCredentials,
          username: siteConfig.username,
          service,
          include_body: true,
        });

        entry.connection = {
          success: result.success,
          message: result.message,
          latency_ms: result.latency_ms,
        };

        if (service === 'jira' && result.success && typeof result.response_body === 'object' && result.response_body !== null) {
          const body = result.response_body as Record<string, unknown>;
          entry.user = {
            displayName: typeof body.displayName === 'string' ? body.displayName : undefined,
            emailAddress: typeof body.emailAddress === 'string' ? body.emailAddress : undefined,
          };
        } else {
          entry.user = null;
        }
      }

      entries.push(entry);
    }

    services[service] = entries;
  }

  return {
    authenticated: hasAnyService,
    services,
  };
}
