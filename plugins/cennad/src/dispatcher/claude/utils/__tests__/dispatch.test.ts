import { describe, expect, it, vi } from 'vitest';

import { spawnClaude } from '../../operations/spawn.js';
import { type ClaudeDispatchInternal, dispatch } from '../dispatch.js';

vi.mock('../../operations/spawn.js', () => ({ spawnClaude: vi.fn() }));

/** Supplies the dispatch boundary while the CLI process is replaced by a mock. */
const INPUT: ClaudeDispatchInternal = {
  argv: [],
  cwd: '/unused',
  options: {},
  externalSessionRef: 'claude-external-session',
  supportedOptions: new Set(),
  idleTimeoutMs: 5000,
  hardCapMs: 10_000,
  resolvedModel: 'configured-model',
  sessionId: 'claude-session',
};

describe('dispatch zero-exit failures', () => {
  it.each([
    {
      name: 'is_error usage limit',
      stdout: JSON.stringify({
        type: 'result',
        is_error: true,
        result: 'Claude AI usage limit reached.',
      }),
      stderr: '',
      response: 'Claude AI usage limit reached.',
      code: 'rate_limit',
      message: 'Claude AI usage limit reached.',
    },
    {
      name: 'failure subtype authentication reason',
      stdout: JSON.stringify({
        type: 'result',
        subtype: 'error_during_execution',
        result: 'Please log in.',
      }),
      stderr: '',
      response: 'Please log in.',
      code: 'auth',
      message: 'Please log in.',
    },
    {
      name: 'failure subtype without result text',
      stdout: JSON.stringify({ type: 'result', subtype: 'rate_limit' }),
      stderr: '',
      response: null,
      code: 'rate_limit',
      message: 'claude reported rate_limit',
    },
    {
      name: 'empty output with a stderr network failure',
      stdout: '',
      stderr: 'ECONNRESET',
      response: null,
      code: 'network',
      message: 'claude produced no output',
    },
    {
      name: 'non-JSON output with a stderr authentication failure',
      stdout: 'not JSON',
      stderr: '401 Unauthorized',
      response: null,
      code: 'auth',
      message: 'claude stream ended without a result event',
    },
    {
      name: 'unrecognized structured failure',
      stdout: JSON.stringify({
        type: 'result',
        is_error: true,
        result: 'Unrecognized failure reason.',
      }),
      stderr: '',
      response: 'Unrecognized failure reason.',
      code: 'unknown',
      message: 'Unrecognized failure reason.',
    },
  ])('normalizes $name through the error mapping', async (failure) => {
    vi.mocked(spawnClaude).mockResolvedValue({
      exitCode: 0,
      stdout: failure.stdout,
      stderr: failure.stderr,
      spawnError: null,
      abortedByCaller: false,
      cancelled: false,
    });

    expect(await dispatch(INPUT)).toEqual({
      status: 'failure',
      response: failure.response,
      error: { code: failure.code, message: failure.message },
      externalSessionRef: INPUT.externalSessionRef,
      ignoredOptions: [],
      resolvedModel: INPUT.resolvedModel,
    });
  });
});
