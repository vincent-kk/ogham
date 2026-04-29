import type { HttpClientConfig, HttpMethod } from './http.js';

export interface FetchContext {
  http: HttpClientConfig;
  service: 'jira' | 'confluence';
  apiVersion: '2' | '3';
}

export interface FetchParams {
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

export interface AssetFetchParams {
  endpoint: string;
  query_params?: Record<string, string>;
  headers?: Record<string, string>;
  save_to_path: string;
  force?: boolean;
}
