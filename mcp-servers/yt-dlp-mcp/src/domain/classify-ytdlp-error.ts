import { ErrorCode } from './errors.js';

interface StderrPattern {
  code: ErrorCode;
  patterns: RegExp[];
}

// Ordered most-specific first; first match wins.
const STDERR_PATTERNS: StderrPattern[] = [
  {
    code: ErrorCode.AGE_RESTRICTED,
    patterns: [
      /age[- ]restricted/i,
      /confirm your age/i,
      /inappropriate for some users/i,
    ],
  },
  {
    code: ErrorCode.BLOCKED,
    patterns: [
      /sign in to confirm/i,
      /not a bot/i,
      /captcha/i,
      /blocked it in your country/i,
    ],
  },
  {
    code: ErrorCode.RATE_LIMITED,
    patterns: [/http error 429/i, /too many requests/i, /rate.?limit/i],
  },
  {
    code: ErrorCode.NO_CAPTIONS,
    patterns: [
      /no subtitles/i,
      /no closed captions/i,
      /there are no subtitles/i,
      /requested format is not available.*subtitle/i,
    ],
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
    patterns: [
      /unsupported url/i,
      /is not a valid url/i,
      /unable to extract/i,
      /no video formats found/i,
    ],
  },
  {
    code: ErrorCode.NETWORK,
    patterns: [
      /getaddrinfo/i,
      /econnrefused/i,
      /econnreset/i,
      /network is unreachable/i,
      /temporary failure in name resolution/i,
      /ssl/i,
      /unable to download webpage/i,
    ],
  },
  {
    code: ErrorCode.TIMEOUT,
    patterns: [/timed out/i, /timeout/i],
  },
];

/** Maps a raw yt-dlp stderr/error string to a typed error code. */
export function classifyYtDlpError(message: string): ErrorCode {
  for (const { code, patterns } of STDERR_PATTERNS) {
    if (patterns.some((re) => re.test(message))) return code;
  }
  return ErrorCode.UNKNOWN;
}
