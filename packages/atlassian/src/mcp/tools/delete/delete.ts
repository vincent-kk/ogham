import { executeRequest } from '../../../core/http-client/index.js';
import type { HttpClientConfig } from '../../../core/http-client/index.js';
import type { McpResponse } from '../../../types/index.js';

interface DeleteParams {
  endpoint: string;
  query_params?: Record<string, string>;
  headers?: Record<string, string>;
}

/** HTTP DELETE tool handler */
export async function handleDelete(
  params: DeleteParams,
  config: HttpClientConfig,
): Promise<McpResponse> {
  return executeRequest(config, {
    method: 'DELETE',
    endpoint: params.endpoint,
    query_params: params.query_params,
    headers: params.headers,
  });
}
