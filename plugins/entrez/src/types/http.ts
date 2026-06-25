/**
 * @file http.ts
 * @description HTTP client contract types. The client is dependency-injected
 * (tool/email/apiKey, fetch, sleep, allowedHosts) so tests mock at this seam —
 * NCBI HTTP is mocked in exactly one place.
 */
import type { ErrorCode, HttpMethod } from "./enums.js";

/** A single outbound request to an NCBI endpoint. */
export interface HttpRequest {
  /** Endpoint URL without query string (e.g. base + "esearch.fcgi"). */
  url: string;
  /** Query/body parameters (undefined values are dropped). */
  params?: Record<string, string | number | boolean | undefined>;
  /** Force a method; omit to let auto-POST decide. */
  method?: HttpMethod;
  /** Inject tool/email/api_key (eutils). Off for idconv/oa.fcgi. Default true. */
  injectAuth?: boolean;
  /** Read the body as binary (ArrayBuffer) instead of text. */
  acceptBinary?: boolean;
}

/** NCBI identity + injected dependencies (DI seam). */
export interface HttpDeps {
  tool: string;
  email: string;
  apiKey?: string;
  /** Hostnames the request URL may resolve to (SSRF allowlist). */
  allowedHosts: readonly string[];
  timeoutMs?: number;
  maxRetries?: number;
  rateRetryMax?: number;
  signal?: AbortSignal;
  /** Injected fetch (tests). */
  fetchImpl?: typeof fetch;
  /** Injected sleep (tests — avoids real backoff waits). */
  sleep?: (ms: number) => Promise<void>;
  /** On-prem opt-in for private-IP destinations. */
  allowPrivateIp?: boolean;
}

/** Normalized response envelope. Secrets (api_key) never appear here. */
export interface HttpResponse {
  ok: boolean;
  status: number;
  method: HttpMethod;
  text?: string;
  binary?: ArrayBuffer;
  contentType?: string;
  error?: { code: ErrorCode; message: string; retryable: boolean };
  /** Whether an api_key was attached (boolean only — never the value). */
  apiKeyUsed: boolean;
}
