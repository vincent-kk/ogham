import { executeRequest } from "../../../../core/httpClient/index.js";
import type {
  AssetFetchParams,
  BinaryResponseBody,
  HttpClientConfig,
  McpResponse,
} from "../../../../types/index.js";
import { validateSavePath } from "../../../../utils/index.js";
import { writeBinary, writeJson } from "../../../../lib/fileIo.js";
import { autoConvertAdf } from "./autoConvertAdf.js";

/**
 * Fetch a GET endpoint and persist the response body at `save_to_path`.
 * Every call performs the request and overwrites the target — there is no cache.
 *
 * @param params - Endpoint, query, headers, target path; `accept_format: "raw"` skips ADF conversion of JSON.
 * @param config - HTTP client config handed to `executeRequest`.
 * @returns The `McpResponse` envelope. On success `data` is `{ saved_to, size_bytes, content_type }`:
 *   binary bodies are written verbatim, JSON bodies as pretty JSON with the inline path's ADF conversion.
 *   A failed request returns its error envelope unchanged and writes nothing.
 */
export async function handleAssetFetch(
  params: AssetFetchParams,
  config: HttpClientConfig,
): Promise<McpResponse> {
  const savePath = validateSavePath(params.save_to_path);

  const response = await executeRequest(config, {
    method: "GET",
    endpoint: params.endpoint,
    query_params: params.query_params,
    headers: params.headers,
    acceptBinary: true,
  });
  if (!response.success) return response;

  if (isBinaryBody(response.data)) {
    const { buffer, contentType } = response.data;
    await writeBinary(savePath, buffer);
    response.data = {
      saved_to: savePath,
      size_bytes: buffer.byteLength,
      content_type: contentType,
    };
    return response;
  }

  const payload =
    params.accept_format === "raw"
      ? response.data
      : autoConvertAdf(response.data);
  const size_bytes = await writeJson(savePath, payload);
  response.data = {
    saved_to: savePath,
    size_bytes,
    content_type: "application/json",
  };
  return response;
}

function isBinaryBody(data: unknown): data is BinaryResponseBody {
  return (
    typeof data === "object" &&
    data !== null &&
    "_binary" in data &&
    data._binary === true
  );
}
