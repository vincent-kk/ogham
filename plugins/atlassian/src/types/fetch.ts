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
  save_to_path?: string;
  force?: boolean;
}

export interface AssetFetchParams {
  endpoint: string;
  query_params?: Record<string, string>;
  headers?: Record<string, string>;
  save_to_path: string;
  force?: boolean;
}
