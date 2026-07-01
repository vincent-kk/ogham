import { classifyYtDlpError } from './classify-ytdlp-error.js';
import { ErrorCode, YtDlpMcpError, isYtDlpMcpError } from './errors.js';

function firstLine(text: string): string {
  const trimmed = text.trim();
  const idx = trimmed.indexOf('\n');
  return idx === -1 ? trimmed : trimmed.slice(0, idx);
}

/**
 * Normalizes any thrown value into a YtDlpMcpError. Recognizes execa error
 * shapes ({ timedOut, stderr, shortMessage, code }) without importing execa.
 */
export function toYtDlpError(value: unknown): YtDlpMcpError {
  if (isYtDlpMcpError(value)) return value;

  if (value && typeof value === 'object') {
    const err = value as {
      timedOut?: boolean;
      isCanceled?: boolean;
      code?: string;
      stderr?: string;
      shortMessage?: string;
      message?: string;
    };

    if (err.timedOut)
      return new YtDlpMcpError(ErrorCode.TIMEOUT, 'yt-dlp timed out', {
        cause: value,
      });
    if (err.code === 'ENOENT')
      return new YtDlpMcpError(
        ErrorCode.BINARY_UNAVAILABLE,
        'yt-dlp binary not found',
        { cause: value },
      );

    const text = err.stderr || err.shortMessage || err.message;
    if (typeof text === 'string' && text.length > 0)
      return new YtDlpMcpError(classifyYtDlpError(text), firstLine(text), {
        cause: value,
      });
  }

  if (value instanceof Error)
    return new YtDlpMcpError(ErrorCode.UNKNOWN, value.message, {
      cause: value,
    });
  return new YtDlpMcpError(ErrorCode.UNKNOWN, String(value), { cause: value });
}
