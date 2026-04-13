import { executeRequest } from '../../../core/http-client/index.js';
import type { HttpClientConfig } from '../../../core/http-client/index.js';
import type { McpResponse } from '../../../types/index.js';
import { markdownToAdf } from '../../../converter/index.js';

interface PostParams {
  endpoint: string;
  body: unknown;
  headers?: Record<string, string>;
  content_type?: string;
  content_format?: 'json' | 'markdown';
}

/** Convert markdown content in body to ADF when content_format is 'markdown' */
function convertBodyMarkdown(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;
  const obj = { ...(body as Record<string, unknown>) };

  // Look for description or body fields that might contain markdown
  for (const key of ['description', 'body']) {
    if (typeof obj[key] === 'string') {
      obj[key] = markdownToAdf(obj[key] as string);
    }
  }

  // Nested fields.description pattern (Jira issue create)
  if (obj.fields && typeof obj.fields === 'object') {
    const fields = { ...(obj.fields as Record<string, unknown>) };
    if (typeof fields.description === 'string') {
      fields.description = markdownToAdf(fields.description as string);
    }
    obj.fields = fields;
  }

  return obj;
}

/** HTTP POST tool handler */
export async function handlePost(
  params: PostParams,
  config: HttpClientConfig,
): Promise<McpResponse> {
  const headers = { ...params.headers };

  if (params.content_type) {
    headers['Content-Type'] = params.content_type;
  }

  // Add CSRF bypass for file uploads
  if (params.content_type === 'multipart/form-data') {
    headers['X-Atlassian-Token'] = 'nocheck';
  }

  let body = params.body;
  if (params.content_format === 'markdown') {
    body = convertBodyMarkdown(body);
  }

  return executeRequest(config, {
    method: 'POST',
    endpoint: params.endpoint,
    body,
    headers: Object.keys(headers).length > 0 ? headers : undefined,
  });
}
