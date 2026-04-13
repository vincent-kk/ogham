import { executeRequest } from '../../../core/http-client/index.js';
import type { HttpClientConfig } from '../../../core/http-client/index.js';
import type { McpResponse } from '../../../types/index.js';
import { adfToMarkdown } from '../../../converter/index.js';

interface GetParams {
  endpoint: string;
  query_params?: Record<string, string>;
  expand?: string[];
  headers?: Record<string, string>;
  accept_format?: 'json' | 'raw';
}

/** Detect ADF content in a response and convert to Markdown */
function autoConvertAdf(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;

  const obj = data as Record<string, unknown>;

  // Check common ADF fields: description, body, comment.body, etc.
  for (const key of ['description', 'body']) {
    const field = obj[key];
    if (field && typeof field === 'object' && (field as Record<string, unknown>).type === 'doc') {
      const markdown = adfToMarkdown(field);
      if (markdown) {
        obj[`${key}_markdown`] = markdown;
      }
    }
  }

  // Nested body.storage or body.atlas_doc_format
  if (obj.body && typeof obj.body === 'object') {
    const body = obj.body as Record<string, unknown>;
    if (body.atlas_doc_format && typeof body.atlas_doc_format === 'object') {
      const adf = body.atlas_doc_format as Record<string, unknown>;
      if (typeof adf.value === 'string') {
        try {
          const parsed = JSON.parse(adf.value as string);
          const markdown = adfToMarkdown(parsed);
          if (markdown) {
            (obj as Record<string, unknown>)['body_markdown'] = markdown;
          }
        } catch { /* not valid JSON ADF */ }
      }
    }
  }

  return data;
}

/** HTTP GET tool handler */
export async function handleGet(
  params: GetParams,
  config: HttpClientConfig,
): Promise<McpResponse> {
  const queryParams = { ...params.query_params };
  if (params.expand && params.expand.length > 0) {
    queryParams['expand'] = params.expand.join(',');
  }

  const response = await executeRequest(config, {
    method: 'GET',
    endpoint: params.endpoint,
    query_params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
    headers: params.headers,
  });

  // Auto-convert ADF to Markdown in successful JSON responses
  if (response.success && params.accept_format !== 'raw') {
    response.data = autoConvertAdf(response.data);
  }

  return response;
}
