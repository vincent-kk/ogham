/** Default request timeout in milliseconds */
export const DEFAULT_TIMEOUT = 30_000;

/** Default SSL verification */
export const DEFAULT_SSL_VERIFY = true;

/** Retry policy defaults */
export const RETRY_MAX_RETRIES = 3;
export const RETRY_BASE_DELAY_MS = 1000;
export const RETRY_BACKOFF_MULTIPLIER = 2;
export const RETRY_MAX_DELAY_MS = 10_000;

/** HTTP status codes that trigger retry */
export const RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504] as const;

/** Error code mapping from HTTP status */
export const ERROR_CODE_MAP: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  429: 'RATE_LIMITED',
} as const;

/** Default error code for 5xx responses */
export const SERVER_ERROR_CODE = 'SERVER_ERROR';

/** Connection test timeout in milliseconds */
export const CONNECTION_TEST_TIMEOUT = 10_000;

/** Cloud hostname pattern */
export const CLOUD_HOSTNAME_PATTERN = /\.atlassian\.net$/;
