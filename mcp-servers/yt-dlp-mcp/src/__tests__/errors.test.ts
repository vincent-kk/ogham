import { describe, expect, it } from 'vitest';

import { classifyYtDlpError } from '../domain/classify-ytdlp-error.js';
import { ErrorCode, YtDlpMcpError } from '../domain/errors.js';
import { toYtDlpError } from '../domain/to-ytdlp-error.js';

describe('classifyYtDlpError', () => {
  it('maps known stderr signatures', () => {
    expect(classifyYtDlpError('ERROR: Sign in to confirm you’re not a bot')).toBe(ErrorCode.BLOCKED);
    expect(classifyYtDlpError('This video is private')).toBe(ErrorCode.VIDEO_UNAVAILABLE);
    expect(classifyYtDlpError('HTTP Error 429: Too Many Requests')).toBe(ErrorCode.RATE_LIMITED);
    expect(classifyYtDlpError('There are no subtitles for the requested languages')).toBe(ErrorCode.NO_CAPTIONS);
    expect(classifyYtDlpError('ERROR: Unsupported URL: foo')).toBe(ErrorCode.INVALID_INPUT);
    expect(classifyYtDlpError('Sign in to confirm your age')).toBe(ErrorCode.AGE_RESTRICTED);
  });

  it('falls back to UNKNOWN', () => {
    expect(classifyYtDlpError('something weird happened')).toBe(ErrorCode.UNKNOWN);
  });
});

describe('toYtDlpError', () => {
  it('passes through existing typed errors', () => {
    const original = new YtDlpMcpError(ErrorCode.NO_CAPTIONS, 'x');
    expect(toYtDlpError(original)).toBe(original);
  });

  it('maps execa timeout', () => {
    expect(toYtDlpError({ timedOut: true, message: 'timed out' }).code).toBe(ErrorCode.TIMEOUT);
  });

  it('maps ENOENT to BINARY_UNAVAILABLE', () => {
    expect(toYtDlpError({ code: 'ENOENT', message: 'spawn yt-dlp' }).code).toBe(ErrorCode.BINARY_UNAVAILABLE);
  });

  it('classifies from stderr and keeps only the first line', () => {
    const err = toYtDlpError({ stderr: 'ERROR: Video unavailable\nstack trace line' });
    expect(err.code).toBe(ErrorCode.VIDEO_UNAVAILABLE);
    expect(err.message).toBe('ERROR: Video unavailable');
  });

  it('marks network/timeout/rate-limit as retriable', () => {
    expect(new YtDlpMcpError(ErrorCode.NETWORK, 'x').retriable).toBe(true);
    expect(new YtDlpMcpError(ErrorCode.VIDEO_UNAVAILABLE, 'x').retriable).toBe(false);
  });
});
