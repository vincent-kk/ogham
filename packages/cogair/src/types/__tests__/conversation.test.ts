import { describe, expect, it } from 'vitest';

import {
  ConversationOptionsSchema,
  ConversationResponseSchema,
} from '../conversation.js';

describe('ConversationOptionsSchema', () => {
  it('accepts empty object', () => {
    expect(ConversationOptionsSchema.parse({})).toEqual({});
  });

  it('passes through unknown keys for forward compatibility', () => {
    const parsed = ConversationOptionsSchema.parse({ future_option: 'value' });
    expect(parsed).toMatchObject({ future_option: 'value' });
  });

  it('does not strip permission flag keys (passthrough), but MCP handlers must ignore them', () => {
    const parsed = ConversationOptionsSchema.parse({
      yolo: true,
      sandbox: 'read-only',
    });
    expect(parsed).toMatchObject({ yolo: true, sandbox: 'read-only' });
  });
});

describe('ConversationResponseSchema', () => {
  const baseSuccess = {
    status: 'success' as const,
    session_id: '00000000-0000-4000-8000-000000000000',
    provider: 'codex' as const,
    response: 'hello',
    error: null,
    meta: {
      turn: 1,
      created_at: '2026-05-22T00:00:00.000Z',
      elapsed_ms: 42,
      ignored_options: [],
    },
  };

  it('parses a valid success envelope', () => {
    expect(ConversationResponseSchema.parse(baseSuccess)).toEqual(baseSuccess);
  });

  it('rejects non-uuid session_id', () => {
    expect(() =>
      ConversationResponseSchema.parse({ ...baseSuccess, session_id: 'nope' }),
    ).toThrow();
  });

  it('requires error object when status is failure', () => {
    const failure = {
      ...baseSuccess,
      status: 'failure' as const,
      response: null,
      error: { code: 'auth' as const, message: 'login required' },
    };
    expect(ConversationResponseSchema.parse(failure)).toEqual(failure);
  });

  it('rejects unknown error code', () => {
    expect(() =>
      ConversationResponseSchema.parse({
        ...baseSuccess,
        status: 'failure',
        response: null,
        error: { code: 'not_a_code', message: 'x' },
      }),
    ).toThrow();
  });
});
