import { stat as fsStat } from 'node:fs/promises';
import { executeRequest } from '../../../../core/http-client/index.js';
import type { HttpClientConfig } from '../../../../core/http-client/index.js';
import type { McpResponse } from '../../../../types/index.js';
import { validateSavePath } from '../../../../utils/index.js';
import { writeBinary } from '../../../../lib/file-io.js';

interface AssetFetchParams {
  endpoint: string;
  query_params?: Record<string, string>;
  headers?: Record<string, string>;
  save_to_path: string;
  force?: boolean;
}

/** Download binary asset with filesystem caching */
export async function handleAssetFetch(
  params: AssetFetchParams,
  config: HttpClientConfig,
): Promise<McpResponse> {
  const savePath = validateSavePath(params.save_to_path);

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
