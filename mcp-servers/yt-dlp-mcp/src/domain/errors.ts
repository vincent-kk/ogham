// Typed error taxonomy (ARCHITECTURE §6-3). Every failure surfaces as a
// YtDlpMcpError with a stable code — no silent `|| ''` fallbacks (PLAN §11.6).

export const ErrorCode = {
  INVALID_INPUT: 'INVALID_INPUT',
  NO_CAPTIONS: 'NO_CAPTIONS',
  VIDEO_UNAVAILABLE: 'VIDEO_UNAVAILABLE',
  AGE_RESTRICTED: 'AGE_RESTRICTED',
  BLOCKED: 'BLOCKED',
  RATE_LIMITED: 'RATE_LIMITED',
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

interface StderrPattern {
  code: ErrorCode;
  patterns: RegExp[];
}

// Ordered most-specific first; first match wins.
const STDERR_PATTERNS: StderrPattern[] = [
  {
    code: ErrorCode.AGE_RESTRICTED,
    patterns: [/age[- ]restricted/i, /confirm your age/i, /inappropriate for some users/i],
  },
  {
    code: ErrorCode.BLOCKED,
    patterns: [/sign in to confirm/i, /not a bot/i, /captcha/i, /blocked it in your country/i],
  },
  {
    code: ErrorCode.RATE_LIMITED,
    patterns: [/http error 429/i, /too many requests/i, /rate.?limit/i],
  },
  {
    code: ErrorCode.NO_CAPTIONS,
    patterns: [/no subtitles/i, /no closed captions/i, /there are no subtitles/i, /requested format is not available.*subtitle/i],
  },
  {
    code: ErrorCode.VIDEO_UNAVAILABLE,
    patterns: [
      /video unavailable/i,
      /this video is (?:unavailable|private|no longer available)/i,
      /private video/i,
      /has been removed/i,
      /account.*terminated/i,
      /members[- ]only/i,
    ],
  },
  {
    code: ErrorCode.INVALID_INPUT,
    patterns: [/unsupported url/i, /is not a valid url/i, /unable to extract/i, /no video formats found/i],
  },
  {
    code: ErrorCode.NETWORK,
    patterns: [/getaddrinfo/i, /econnrefused/i, /econnreset/i, /network is unreachable/i, /temporary failure in name resolution/i, /ssl/i, /unable to download webpage/i],
  },
  {
    code: ErrorCode.TIMEOUT,
    patterns: [/timed out/i, /timeout/i],
  },
];

/**
 * Maps a raw yt-dlp stderr/error string to a typed error code.
 */
export function classifyYtDlpError(message: string): ErrorCode {
  for (const { code, patterns } of STDERR_PATTERNS) {
    if (patterns.some((re) => re.test(message))) {
      return code;
    }
  }
  return ErrorCode.UNKNOWN;
}

/**
 * Normalizes any thrown value into a YtDlpMcpError. Recognizes execa error
 * shapes ({ timedOut, stderr, shortMessage, code }) without importing execa.
 */
export function toYtDlpError(value: unknown): YtDlpMcpError {
  if (isYtDlpMcpError(value)) {
    return value;
  }

  if (value && typeof value === 'object') {
    const err = value as {
      timedOut?: boolean;
      isCanceled?: boolean;
      code?: string;
      stderr?: string;
      shortMessage?: string;
      message?: string;
    };

    if (err.timedOut) {
      return new YtDlpMcpError(ErrorCode.TIMEOUT, 'yt-dlp timed out', { cause: value });
    }
    if (err.code === 'ENOENT') {
      return new YtDlpMcpError(ErrorCode.BINARY_UNAVAILABLE, 'yt-dlp binary not found', { cause: value });
    }

    const text = err.stderr || err.shortMessage || err.message;
    if (typeof text === 'string' && text.length > 0) {
      return new YtDlpMcpError(classifyYtDlpError(text), firstLine(text), { cause: value });
    }
  }

  if (value instanceof Error) {
    return new YtDlpMcpError(ErrorCode.UNKNOWN, value.message, { cause: value });
  }
  return new YtDlpMcpError(ErrorCode.UNKNOWN, String(value), { cause: value });
}

function firstLine(text: string): string {
  const trimmed = text.trim();
  const idx = trimmed.indexOf('\n');
  return idx === -1 ? trimmed : trimmed.slice(0, idx);
}
