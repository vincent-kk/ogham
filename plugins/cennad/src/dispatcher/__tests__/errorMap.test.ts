import { describe, expect, it } from 'vitest';

import { ErrorCode } from '../../types/index.js';
import { mapError } from '../errorMap/index.js';

describe('mapError', () => {
  it('maps exit 127 to cli_error', () => {
    expect(
      mapError({ exitCode: 127, stderr: 'codex: command not found' }).code,
    ).toBe(ErrorCode.CliError);
  });

  it('maps exit 42 to cli_error', () => {
    expect(mapError({ exitCode: 42, stderr: '' }).code).toBe(
      ErrorCode.CliError,
    );
  });

  it('maps exit 53 to budget_exhausted (gemini turn-limit on resume)', () => {
    expect(mapError({ exitCode: 53, stderr: '' }).code).toBe(
      ErrorCode.BudgetExhausted,
    );
  });

  it('maps exit 55 to auth (gemini untrusted workspace)', () => {
    expect(mapError({ exitCode: 55, stderr: '' }).code).toBe(ErrorCode.Auth);
  });

  it('maps exit 73 to cli_error (lock busy)', () => {
    expect(mapError({ exitCode: 73, stderr: '' }).code).toBe(
      ErrorCode.CliError,
    );
  });

  it('maps HTTP 401 / 403 in stderr to auth', () => {
    expect(
      mapError({ exitCode: 1, stderr: 'HTTP 401 Unauthorized' }).code,
    ).toBe(ErrorCode.Auth);
    expect(mapError({ exitCode: 1, stderr: 'got 403 status' }).code).toBe(
      ErrorCode.Auth,
    );
  });

  it('maps HTTP 429 in stderr to rate_limit', () => {
    expect(mapError({ exitCode: 1, stderr: 'rate limit: 429' }).code).toBe(
      ErrorCode.RateLimit,
    );
  });

  it('maps network errors in stderr to network', () => {
    expect(mapError({ exitCode: 1, stderr: 'ECONNRESET' }).code).toBe(
      ErrorCode.Network,
    );
    expect(
      mapError({ exitCode: 1, stderr: 'getaddrinfo ETIMEDOUT' }).code,
    ).toBe(ErrorCode.Network);
    expect(
      mapError({ exitCode: 1, stderr: 'ENOTFOUND example.com' }).code,
    ).toBe(ErrorCode.Network);
  });

  it('maps spawn errors via the node-code table', () => {
    const enoent = Object.assign(new Error('not found'), { code: 'ENOENT' });
    expect(
      mapError({
        exitCode: -1,
        stderr: '',
        spawnError: enoent as NodeJS.ErrnoException,
      }).code,
    ).toBe(ErrorCode.CliError);
    const reset = Object.assign(new Error('reset'), { code: 'ECONNRESET' });
    expect(
      mapError({
        exitCode: -1,
        stderr: '',
        spawnError: reset as NodeJS.ErrnoException,
      }).code,
    ).toBe(ErrorCode.Network);
  });

  it('returns unknown for unmapped exit codes with no stderr signal', () => {
    expect(mapError({ exitCode: 99, stderr: 'mysterious failure' }).code).toBe(
      ErrorCode.Unknown,
    );
  });

  it('echoes the last few stderr lines in the message when present', () => {
    const stderr = 'line1\nline2\nline3\nfinal: HTTP 401';
    const result = mapError({ exitCode: 1, stderr });
    expect(result.code).toBe(ErrorCode.Auth);
    expect(result.message).toContain('HTTP 401');
  });

  it('maps quota / capacity exhaustion in stderr to rate_limit (no literal 429)', () => {
    expect(
      mapError({ exitCode: 1, stderr: 'Error: RESOURCE_EXHAUSTED' }).code,
    ).toBe(ErrorCode.RateLimit);
    expect(
      mapError({ exitCode: 1, stderr: 'quota exceeded for this model' }).code,
    ).toBe(ErrorCode.RateLimit);
    expect(
      mapError({
        exitCode: 1,
        stderr: 'You have exhausted your capacity on this model.',
      }).code,
    ).toBe(ErrorCode.RateLimit);
  });

  it('prefers a rate-limit stderr signal over an ETIMEDOUT spawn timeout', () => {
    const err = Object.assign(new Error('timed out'), { code: 'ETIMEDOUT' });
    const stderr =
      'Attempt 2 failed: You have exhausted your capacity on this model. Your quota will reset after 1s.';
    expect(
      mapError({
        exitCode: -1,
        stderr,
        spawnError: err as NodeJS.ErrnoException,
      }).code,
    ).toBe(ErrorCode.RateLimit);
  });

  it('still maps a bare spawn timeout (no provider signal) to network', () => {
    const err = Object.assign(new Error('timed out'), { code: 'ETIMEDOUT' });
    expect(
      mapError({
        exitCode: -1,
        stderr: '',
        spawnError: err as NodeJS.ErrnoException,
      }).code,
    ).toBe(ErrorCode.Network);
  });

  it('maps a caller-aborted retry storm to rate_limit', () => {
    expect(
      mapError({
        exitCode: -1,
        stderr: 'transient failure, retrying repeatedly',
        abortedByCaller: true,
      }).code,
    ).toBe(ErrorCode.RateLimit);
  });
});
