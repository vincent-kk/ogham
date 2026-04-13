import { executeRequest } from '../../../core/http-client/index.js';
import type { HttpClientConfig } from '../../../core/http-client/index.js';
import type { McpResponse } from '../../../types/index.js';
import { markdownToAdf, markdownToStorage } from '../../../converter/index.js';

interface PutParams {
  endpoint: string;
  body: unknown;
  method?: 'PUT' | 'PATCH';
  headers?: Record<string, string>;
  content_format?: 'json' | 'markdown';
}

/** Convert markdown in body to ADF or Storage Format */
function convertBodyMarkdown(body: unknown, endpoint: string): unknown {
  if (!body || typeof body !== 'object') return body;
  const obj = { ...(body as Record<string, unknown>) };

  const isConfluence = endpoint.includes('/wiki/') || endpoint.includes('/api/v2/pages');

  for (const key of ['description', 'body']) {
    if (typeof obj[key] === 'string') {
      if (isConfluence) {
        obj[key] = { storage: { value: markdownToStorage(obj[key] as string), representation: 'storage' } };
      } else {
        obj[key] = markdownToAdf(obj[key] as string);
      }
    }
  }

  // Nested fields.description for Jira
  if (obj.fields && typeof obj.fields === 'object') {
    const fields = { ...(obj.fields as Record<string, unknown>) };
    if (typeof fields.description === 'string') {
      fields.description = markdownToAdf(fields.description as string);
    }
    obj.fields = fields;
  }

  return obj;
}

/** HTTP PUT/PATCH tool handler */
export async function handlePut(
  params: PutParams,
  config: HttpClientConfig,
): Promise<McpResponse> {
  let body = params.body;
  if (params.content_format === 'markdown') {
    body = convertBodyMarkdown(body, params.endpoint);
  }

  return executeRequest(config, {
    method: params.method ?? 'PUT',
    endpoint: params.endpoint,
    body,
    headers: params.headers,
  });
}
