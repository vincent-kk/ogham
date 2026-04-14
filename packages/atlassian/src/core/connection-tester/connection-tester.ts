import type { ConnectionTestResult, HttpClientConfig, TestConnectionParams } from '../../types/index.js';
import { CONNECTION_TEST_TIMEOUT } from '../../constants/index.js';
import { resolveEnvironment, getApiVersion, executeRequest } from '../index.js';
import { buildAuthHeader } from '../../utils/index.js';

function getTestEndpoint(service: 'jira' | 'confluence', isCloud: boolean): string {
  if (service === 'jira') {
    const version = getApiVersion(isCloud);
    return `/rest/api/${version}/myself`;
  }
  // Confluence
  if (isCloud) {
    return '/wiki/rest/api/space?limit=1';
  }
  return '/rest/api/space?limit=1';
}

/** Test connection to a Jira or Confluence instance */
export async function testConnection(params: TestConnectionParams): Promise<ConnectionTestResult> {
  const { base_url, auth_type, credentials, username, service, include_body = false } = params;

  const env = resolveEnvironment(base_url);
  const endpoint = getTestEndpoint(service, env.is_cloud);

  const authPayload = buildAuthHeader(auth_type, credentials, username);
  if (!authPayload) {
    return {
      service,
      success: false,
      message: 'Invalid or missing credentials for the selected auth type',
    };
  }

  const clientConfig: HttpClientConfig = {
    base_url: env.base_url,
    auth_header: authPayload.value,
  };

  const start = Date.now();

  const response = await executeRequest(clientConfig, {
    method: 'GET',
    endpoint,
    timeout: CONNECTION_TEST_TIMEOUT,
  });

  const latency_ms = Date.now() - start;

  if (response.success) {
    const result: ConnectionTestResult = {
      service,
      success: true,
      message: `Connected to ${service} (${env.is_cloud ? 'Cloud' : 'Server'})`,
      latency_ms,
    };
    if (include_body) {
      result.response_body = response.data;
    }
    return result;
  }

  const errorMessage = response.error?.code === 'UNAUTHORIZED'
    ? 'Authentication failed — check your credentials'
    : response.error?.message ?? 'Connection failed';

  return {
    service,
    success: false,
    message: errorMessage,
    latency_ms,
  };
}
