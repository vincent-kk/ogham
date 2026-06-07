import { describe, expect, it } from 'vitest';

import { mapError } from '../errorMap/index.js';

describe('mapError', () => {
  it('maps exit 127 to cli_error', () => {
    expect(
      mapError({ exitCode: 127, stderr: 'codex: command not found' }).code,
    ).toBe('cli_error');
  });

  it('maps exit 42 to cli_error', () => {
    expect(mapError({ exitCode: 42, stderr: '' }).code).toBe('cli_error');
  });

  it('maps exit 53 to budget_exhausted (gemini turn-limit on resume)', () => {
    expect(mapError({ exitCode: 53, stderr: '' }).code).toBe(
      'budget_exhausted',
    );
  });

  it('maps exit 55 to auth (gemini untrusted workspace)', () => {
    expect(mapError({ exitCode: 55, stderr: '' }).code).toBe('auth');
  });

  it('maps exit 73 to cli_error (lock busy)', () => {
    expect(mapError({ exitCode: 73, stderr: '' }).code).toBe('cli_error');
  });

  it('maps HTTP 401 / 403 in stderr to auth', () => {
    expect(
      mapError({ exitCode: 1, stderr: 'HTTP 401 Unauthorized' }).code,
    ).toBe('auth');
    expect(mapError({ exitCode: 1, stderr: 'got 403 status' }).code).toBe(
      'auth',
    );
  });

  it('maps HTTP 429 in stderr to rate_limit', () => {
    expect(mapError({ exitCode: 1, stderr: 'rate limit: 429' }).code).toBe(
      'rate_limit',
    );
  });

  it('maps network errors in stderr to network', () => {
    expect(mapError({ exitCode: 1, stderr: 'ECONNRESET' }).code).toBe(
      'network',
    );
    expect(
      mapError({ exitCode: 1, stderr: 'getaddrinfo ETIMEDOUT' }).code,
    ).toBe('network');
    expect(
      mapError({ exitCode: 1, stderr: 'ENOTFOUND example.com' }).code,
    ).toBe('network');
  });

  it('maps spawn ENOENT to cli_error', () => {
    const err = Object.assign(new Error('not found'), { code: 'ENOENT' });
    expect(
      mapError({
        exitCode: -1,
        stderr: '',
        spawnError: err as NodeJS.ErrnoException,
      }).code,
    ).toBe('cli_error');
  });

  it('maps spawn ECONNRESET to network', () => {
    const err = Object.assign(new Error('reset'), { code: 'ECONNRESET' });
    expect(
      mapError({
        exitCode: -1,
        stderr: '',
        spawnError: err as NodeJS.ErrnoException,
      }).code,
    ).toBe('network');
  });

  it('returns unknown for unmapped exit codes with no stderr signal', () => {
    expect(mapError({ exitCode: 99, stderr: 'mysterious failure' }).code).toBe(
      'unknown',
    );
  });

  it('echoes the last few stderr lines in the message when present', () => {
    const stderr = 'line1\nline2\nline3\nfinal: HTTP 401';
    const result = mapError({ exitCode: 1, stderr });
    expect(result.code).toBe('auth');
    expect(result.message).toContain('HTTP 401');
  });
});
