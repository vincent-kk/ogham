import { performance } from 'node:perf_hooks';

import { describe, expect, it } from 'vitest';

import type { DispatchResult } from '../../types/index.js';
import { buildResponse } from '../entities/envelope.js';

function successResult(
  overrides: Partial<DispatchResult> = {},
): DispatchResult {
  return {
    status: 'success',
    response: 'hello',
    error: null,
    externalSessionRef: 'ref-123',
    ignoredOptions: [],
    resolvedModel: 'gpt-5-codex',
    ...overrides,
  };
}

describe('buildResponse', () => {
  it('packs a success DispatchResult into a ConversationResponse', () => {
    const startedAt = performance.now() - 50;
    const response = buildResponse({
      sessionId: 'cennad-session',
      provider: 'codex',
      result: successResult(),
      turn: 1,
      createdAt: '2026-05-22T00:00:00.000Z',
      startedAt,
    });
    expect(response.status).toBe('success');
    expect(response.session_id).toBe('cennad-session');
    expect(response.provider).toBe('codex');
    expect(response.response).toBe('hello');
    expect(response.error).toBeNull();
    expect(response.meta.turn).toBe(1);
    expect(response.meta.created_at).toBe('2026-05-22T00:00:00.000Z');
    expect(response.meta.elapsed_ms).toBeGreaterThanOrEqual(0);
    expect(response.meta.ignored_options).toEqual([]);
  });

  it('packs a failure DispatchResult with the error field', () => {
    const response = buildResponse({
      sessionId: 'cennad-session',
      provider: 'gemini',
      result: {
        status: 'failure',
        response: null,
        error: { code: 'auth', message: 'HTTP 401' },
        externalSessionRef: '',
        ignoredOptions: [],
        resolvedModel: null,
      },
      turn: 0,
      createdAt: '2026-05-22T00:00:00.000Z',
      startedAt: performance.now(),
    });
    expect(response.status).toBe('failure');
    expect(response.error).toEqual({ code: 'auth', message: 'HTTP 401' });
    expect(response.response).toBeNull();
  });

  it('forwards ignored_options verbatim', () => {
    const response = buildResponse({
      sessionId: 'cennad-session',
      provider: 'codex',
      result: successResult({ ignoredOptions: ['multi_agent', 'search'] }),
      turn: 3,
      createdAt: '2026-05-22T00:00:00.000Z',
      startedAt: performance.now(),
    });
    expect(response.meta.ignored_options).toEqual(['multi_agent', 'search']);
  });

  it('rounds elapsed_ms to an integer', () => {
    const startedAt = performance.now() - 12.7;
    const response = buildResponse({
      sessionId: 's',
      provider: 'codex',
      result: successResult(),
      turn: 1,
      createdAt: '2026-05-22T00:00:00.000Z',
      startedAt,
    });
    expect(Number.isInteger(response.meta.elapsed_ms)).toBe(true);
  });

  it('omits artifact_path when not provided', () => {
    const response = buildResponse({
      sessionId: 's',
      provider: 'codex',
      result: successResult(),
      turn: 1,
      createdAt: '2026-05-22T00:00:00.000Z',
      startedAt: performance.now(),
    });
    expect('artifact_path' in response).toBe(false);
  });

  it('includes artifact_path when provided', () => {
    const response = buildResponse({
      sessionId: 's',
      provider: 'codex',
      result: successResult(),
      turn: 1,
      createdAt: '2026-05-22T00:00:00.000Z',
      startedAt: performance.now(),
      artifactPath: '/tmp/work/.cennad/artifacts/sid-1.md',
    });
    expect(response.artifact_path).toBe('/tmp/work/.cennad/artifacts/sid-1.md');
  });
});
