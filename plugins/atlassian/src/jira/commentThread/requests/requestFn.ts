import type {
  HttpClientConfig,
  McpResponse,
  RequestOptions,
} from "../../../types/index.js";

/** The transport the recipe is handed — `executeRequest` in production, a route table in tests. */
export type RequestFn = (
  config: HttpClientConfig,
  options: RequestOptions,
) => Promise<McpResponse>;
