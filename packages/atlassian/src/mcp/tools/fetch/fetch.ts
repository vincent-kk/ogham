import { stat as fsStat } from 'node:fs/promises';
import { executeRequest } from '../../../core/http-client/index.js';
import type { HttpClientConfig } from '../../../core/http-client/index.js';
import type { McpResponse } from '../../../types/index.js';
import { adfToMarkdown, markdownToAdf, markdownToStorage } from '../../../converter/index.js';
import { validateSavePath } from '../../../utils/index.js';
import { writeBinary } from '../../../lib/file-io.js';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface FetchParams {
  method: HttpMethod;
  endpoint: string;
  body?: unknown;
  query_params?: Record<string, string>;
  expand?: string[];
  headers?: Record<string, string>;
  accept_format?: 'json' | 'raw';
  content_type?: string;
  content_format?: 'json' | 'markdown';
  save_to_path?: string;
  force?: boolean;
}

/** Detect ADF content in a response and convert to Markdown */
function autoConvertAdf(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;

  const obj = data as Record<string, unknown>;

  for (const key of ['description', 'body']) {
    const field = obj[key];
    if (field && typeof field === 'object' && (field as Record<string, unknown>).type === 'doc') {
      const markdown = adfToMarkdown(field);
      if (markdown) {
        obj[`${key}_markdown`] = markdown;
      }
    }
  }

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

/** Convert markdown content in body to ADF */
function convertBodyToAdf(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;
  const obj = { ...(body as Record<string, unknown>) };

  for (const key of ['description', 'body']) {
    if (typeof obj[key] === 'string') {
      obj[key] = markdownToAdf(obj[key] as string);
    }
  }

  if (obj.fields && typeof obj.fields === 'object') {
    const fields = { ...(obj.fields as Record<string, unknown>) };
    if (typeof fields.description === 'string') {
      fields.description = markdownToAdf(fields.description as string);
    }
    obj.fields = fields;
  }

  return obj;
}

/** Convert markdown in body to ADF or Storage Format (endpoint-aware) */
function convertBodyForUpdate(body: unknown, endpoint: string): unknown {
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

  if (obj.fields && typeof obj.fields === 'object') {
    const fields = { ...(obj.fields as Record<string, unknown>) };
    if (typeof fields.description === 'string') {
      fields.description = markdownToAdf(fields.description as string);
    }
    obj.fields = fields;
  }

  return obj;
}

/** Download binary asset with filesystem caching */
async function handleAssetFetch(
  params: FetchParams,
  config: HttpClientConfig,
): Promise<McpResponse> {
  const savePath = validateSavePath(params.save_to_path!);

  // Cache check: return existing file without HTTP request
  if (!params.force) {
    try {
      const s = await fsStat(savePath);
      return { success: true, status: 200, data: { saved_to: savePath, size_bytes: s.size, cached: true } };
    } catch { /* not cached, proceed with download */ }
  }

  const response = await executeRequest(config, {
    method: 'GET',
    endpoint: params.endpoint,
    query_params: params.query_params,
    headers: params.headers,
    acceptBinary: true,
  });

  if (response.success && response.data) {
    const data = response.data as Record<string, unknown>;
    if (data._binary === true) {
      const buffer = data.buffer as ArrayBuffer;
      await writeBinary(savePath, buffer);
      response.data = { saved_to: savePath, size_bytes: buffer.byteLength, content_type: data.contentType };
    }
  }

  return response;
}

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
        return handleAssetFetch(params, config);
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
