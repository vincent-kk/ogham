import type {
  HttpClientConfig,
  McpResponse,
  RequestOptions,
} from "../../../../types/index.js";

/** One deterministic route handled by `fakeRequest`. */
export interface FakeRoute {
  method: string;
  endpoint: string;
  query?: Record<string, string>;
  response: McpResponse;
}

/** Route table keyed by method + endpoint (+ optional query subset); unmatched calls return a 404 envelope. Every call is recorded. */
export function fakeRequest(routes: FakeRoute[]) {
  const calls: RequestOptions[] = [];
  const request = async (
    _config: HttpClientConfig,
    options: RequestOptions,
  ): Promise<McpResponse> => {
    calls.push(options);
    const hit = routes.find(
      (route) =>
        route.method === options.method &&
        route.endpoint === options.endpoint &&
        Object.entries(route.query ?? {}).every(
          ([key, value]) => options.query_params?.[key] === value,
        ),
    );
    return (
      hit?.response ?? {
        success: false,
        status: 404,
        data: null,
        error: { code: "NOT_FOUND", message: "HTTP 404", retryable: false },
      }
    );
  };
  return { request, calls };
}
