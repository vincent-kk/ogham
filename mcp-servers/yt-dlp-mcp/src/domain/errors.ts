// Typed error taxonomy (ARCHITECTURE §6-3). Every failure surfaces as a
// YtDlpMcpError with a stable code — no silent `|| ''` fallbacks (PLAN §11.6).
// Classification (stderr → code) lives in classify-ytdlp-error.ts; normalization
// of thrown values lives in to-ytdlp-error.ts.

export const ErrorCode = {
  INVALID_INPUT: 'INVALID_INPUT',
  NO_CAPTIONS: 'NO_CAPTIONS',
  VIDEO_UNAVAILABLE: 'VIDEO_UNAVAILABLE',
  AGE_RESTRICTED: 'AGE_RESTRICTED',
  BLOCKED: 'BLOCKED',
  RATE_LIMITED: 'RATE_LIMITED',
  COOKIE_UNAVAILABLE: 'COOKIE_UNAVAILABLE',
  BINARY_UNAVAILABLE: 'BINARY_UNAVAILABLE',
  CHECKSUM_MISMATCH: 'CHECKSUM_MISMATCH',
  DOWNLOAD_FAILED: 'DOWNLOAD_FAILED',
  TIMEOUT: 'TIMEOUT',
  NETWORK: 'NETWORK',
  UNKNOWN: 'UNKNOWN',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

const RETRIABLE: ReadonlySet<ErrorCode> = new Set([
  ErrorCode.RATE_LIMITED,
  ErrorCode.NETWORK,
  ErrorCode.TIMEOUT,
]);

export class YtDlpMcpError extends Error {
  readonly code: ErrorCode;
  readonly retriable: boolean;

  constructor(code: ErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'YtDlpMcpError';
    this.code = code;
    this.retriable = RETRIABLE.has(code);
  }
}

export function isYtDlpMcpError(value: unknown): value is YtDlpMcpError {
  return value instanceof YtDlpMcpError;
}
