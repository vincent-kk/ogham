import type { HttpClientConfig, HttpMethod } from "./http.js";

export interface FetchContext {
  http: HttpClientConfig;
  service: "jira" | "confluence";
  /**
   * Service-specific API version.
   * - Jira: `'2' | '3'` (REST API path segment)
   * - Confluence: `'v1' | 'v2'` (Cloud V2 vs V1/DC dispatch)
   */
  apiVersion: "2" | "3" | "v1" | "v2";
  /**
   * Whether the target deployment requires `X-Atlassian-Token: no-check`
   * on non-GET requests. True for Server/Data Center (mandatory in DC 9.0+ XSRF posture).
   */
  requires_xsrf_bypass?: boolean;
  /** Deployment of the resolved site; `true` for `*.atlassian.net`. Domain adapters gate on it — `fetch` does not read it. */
  is_cloud?: boolean;
}

export interface FetchParams {
  method: HttpMethod;
  endpoint: string;
  body?: unknown;
  query_params?: Record<string, string>;
  expand?: string[];
  headers?: Record<string, string>;
  accept_format?: "json" | "raw";
  content_type?: string;
  content_format?: "json" | "markdown";
  /** Persist the GET response body at this path (resolved under `.temp/`) instead of returning it inline. */
  save_to_path?: string;
  project_root?: string;
}

/** GET request whose response body is written to `save_to_path`. */
export interface AssetFetchParams {
  endpoint: string;
  query_params?: Record<string, string>;
  headers?: Record<string, string>;
  /** Target path — validated and resolved under `{projectRoot}/.temp/` by `validateSavePath`. */
  save_to_path: string;
  /** `"raw"` skips the ADF conversion; the body is still written as pretty JSON. Otherwise ADF fields gain `*_markdown` twins before the write. */
  accept_format?: "json" | "raw";
}
