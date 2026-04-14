import { executeRequest } from '../../../core/http-client/index.js';
import type { HttpClientConfig, McpResponse, FetchParams } from '../../../types/index.js';
import { autoConvertAdf } from './utils/auto-convert-adf.js';
import { convertBodyToAdf } from './utils/convert-body-to-adf.js';
import { convertBodyForUpdate } from './utils/convert-body-for-update.js';
import { handleAssetFetch } from './utils/asset-fetch.js';

/** Unified HTTP tool handler */
export async function handleFetch(
  params: FetchParams,
  config: HttpClientConfig,
): Promise<McpResponse> {
  const { method, endpoint } = params;

  // Early validation: reject invalid method+param combos
  if (method === 'GET' && params.body !== undefined) {
    throw new Error('GET requests must not include a body');
  }
  if (method === 'DELETE' && params.body !== undefined) {
    throw new Error('DELETE requests must not include a body');
  }

  switch (method) {
    case 'GET': {
      // Asset fetch: binary download with caching
      if (params.save_to_path) {
        return handleAssetFetch(
          {
            endpoint,
            query_params: params.query_params,
            headers: params.headers,
            save_to_path: params.save_to_path,
            force: params.force,
          },
          config,
        );
      }

      // Document fetch: JSON API with ADF conversion
      const queryParams = { ...params.query_params };
      if (params.expand && params.expand.length > 0) {
        queryParams['expand'] = params.expand.join(',');
      }

      const response = await executeRequest(config, {
        method: 'GET',
        endpoint,
        query_params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
        headers: params.headers,
      });

      if (response.success && response.data && params.accept_format !== 'raw') {
        response.data = autoConvertAdf(response.data);
      }

      return response;
    }

    case 'POST': {
      const headers = { ...params.headers };

      if (params.content_type) {
        headers['Content-Type'] = params.content_type;
      }

      if (params.content_type === 'multipart/form-data') {
        headers['X-Atlassian-Token'] = 'nocheck';
      }

      let body = params.body;
      if (params.content_format === 'markdown') {
        body = convertBodyToAdf(body);
      }

      return executeRequest(config, {
        method: 'POST',
        endpoint,
        body,
        headers: Object.keys(headers).length > 0 ? headers : undefined,
      });
    }

    case 'PUT':
    case 'PATCH': {
      let body = params.body;
      if (params.content_format === 'markdown') {
        body = convertBodyForUpdate(body, endpoint);
      }

      return executeRequest(config, {
        method,
        endpoint,
        body,
        headers: params.headers,
      });
    }

    case 'DELETE': {
      return executeRequest(config, {
        method: 'DELETE',
        endpoint,
        query_params: params.query_params,
        headers: params.headers,
      });
    }
  }
}
