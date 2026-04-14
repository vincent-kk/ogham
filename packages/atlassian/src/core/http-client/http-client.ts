import type { McpResponse, HttpMethod } from '../../types/index.js';
import {
  RETRY_MAX_RETRIES,
  RETRY_BASE_DELAY_MS,
  RETRY_BACKOFF_MULTIPLIER,
  RETRY_MAX_DELAY_MS,
  RETRYABLE_STATUS_CODES,
  ERROR_CODE_MAP,
  SERVER_ERROR_CODE,
  DEFAULT_TIMEOUT,
} from '../../constants/index.js';
import { buildUrl, extractHostname } from '../../utils/index.js';
import { validateUrl } from './ssrf-guard.js';

export interface HttpClientConfig {
  base_url: string;
  auth_header?: string;
  ssl_verify?: boolean;
  timeout?: number;
}

export interface RequestOptions {
  method: HttpMethod;
  endpoint: string;
  body?: unknown;
  headers?: Record<string, string>;
  query_params?: Record<string, string>;
  timeout?: number;
  acceptBinary?: boolean;
}

function getErrorCode(status: number): string {
  return ERROR_CODE_MAP[status] ?? (status >= 500 ? SERVER_ERROR_CODE : 'UNKNOWN_ERROR');
}

function isRetryable(status: number): boolean {
  return (RETRYABLE_STATUS_CODES as readonly number[]).includes(status);
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Execute an HTTP request with retry, auth injection, and SSRF protection */
export async function executeRequest(
  config: HttpClientConfig,
  options: RequestOptions,
): Promise<McpResponse> {
  const url = buildUrl(config.base_url, options.endpoint, options.query_params);
  const allowedHostname = extractHostname(config.base_url);

  // SSRF validation
  await validateUrl(url, allowedHostname);

  const timeout = options.timeout ?? config.timeout ?? DEFAULT_TIMEOUT;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': options.acceptBinary ? '*/*' : 'application/json',
    ...options.headers,
  };

  // Auth injection — tokens never exposed to caller
  if (config.auth_header) {
    headers['Authorization'] = config.auth_header;
  }

  const fetchOptions: RequestInit = {
    method: options.method,
    headers,
    signal: AbortSignal.timeout(timeout),
  };

  if (options.body && options.method !== 'GET' && options.method !== 'DELETE') {
    fetchOptions.body = JSON.stringify(options.body);
  }

  let lastError: McpResponse | null = null;

  for (let attempt = 0; attempt <= RETRY_MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const backoff = Math.min(
        RETRY_BASE_DELAY_MS * Math.pow(RETRY_BACKOFF_MULTIPLIER, attempt - 1),
        RETRY_MAX_DELAY_MS,
      );
      await delay(backoff);
    }

    try {
      const response = await fetch(url, fetchOptions);
      const status = response.status;

      if (status >= 200 && status < 300) {
        let data: unknown = null;
        const contentType = response.headers.get('content-type') ?? '';
        if (options.acceptBinary && !contentType.includes('application/json')) {
          const buffer = await response.arrayBuffer();
          data = { _binary: true, buffer, contentType };
        } else if (contentType.includes('application/json')) {
          data = await response.json();
        } else if (status !== 204) {
          data = await response.text();
        }

        return {
          success: true,
          status,
          data,
        };
      }

      // Build error response
      let details: unknown;
      try {
        details = await response.json();
      } catch {
        details = await response.text().catch(() => undefined);
      }

      const errorResponse: McpResponse = {
        success: false,
        status,
        data: null,
        error: {
          code: getErrorCode(status),
          message: `HTTP ${status}: ${response.statusText}`,
          retryable: isRetryable(status),
          reauth_required: status === 401 ? true : undefined,
          details,
        },
      };

      if (!isRetryable(status) || attempt === RETRY_MAX_RETRIES) {
        return errorResponse;
      }

      // Check Retry-After header for 429
      if (status === 429) {
        const retryAfter = response.headers.get('retry-after');
        if (retryAfter) {
          const retryMs = parseInt(retryAfter, 10) * 1000;
          if (!isNaN(retryMs) && retryMs > 0) {
            await delay(Math.min(retryMs, RETRY_MAX_DELAY_MS));
            continue;
          }
        }
      }

      lastError = errorResponse;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      lastError = {
        success: false,
        status: 0,
        data: null,
        error: {
          code: 'NETWORK_ERROR',
          message,
          retryable: attempt < RETRY_MAX_RETRIES,
        },
      };

      if (attempt === RETRY_MAX_RETRIES) {
        return lastError;
      }
    }
  }

  return lastError!;
}
