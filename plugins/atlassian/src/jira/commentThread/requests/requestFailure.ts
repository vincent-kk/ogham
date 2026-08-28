import type { McpResponse } from "../../../types/index.js";

/** Error for a request the recipe cannot degrade around; the envelope's `error` rides along as `cause` for `toolError`. */
export function requestFailure(endpoint: string, response: McpResponse): Error {
  return new Error(
    `GET ${endpoint} failed: ${response.error?.message ?? `HTTP ${response.status}`}`,
    { cause: response.error },
  );
}
