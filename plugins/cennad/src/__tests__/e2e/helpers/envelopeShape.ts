import { expect } from 'vitest';

import {
  type ConversationResponse,
  ConversationResponseSchema,
  type ErrorCode,
  type Provider,
} from '../../../types/index.js';

import type { HookResult } from './hookRunnerLayerA.js';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export interface SuccessExpect {
  provider: Provider;
  turn: number;
}

export function assertEnvelopeSuccess(
  envelope: unknown,
  expectation: SuccessExpect,
): ConversationResponse {
  const parsed = ConversationResponseSchema.parse(envelope);
  expect(
    parsed.status,
    `expected success but dispatch returned ${parsed.status}: ${JSON.stringify(parsed.error)}`,
  ).toBe('success');
  expect(parsed.provider).toBe(expectation.provider);
  expect(parsed.meta.turn).toBe(expectation.turn);
  expect(parsed.error).toBeNull();
  expect(parsed.session_id).toMatch(UUID_RE);
  return parsed;
}

export interface FailureExpect {
  code: ErrorCode;
  provider?: Provider;
}

export function assertEnvelopeFailure(
  envelope: unknown,
  expectation: FailureExpect,
): ConversationResponse {
  const parsed = ConversationResponseSchema.parse(envelope);
  expect(parsed.status).toBe('failure');
  expect(parsed.error?.code).toBe(expectation.code);
  if (expectation.provider) expect(parsed.provider).toBe(expectation.provider);
  return parsed;
}

export interface HookExpect {
  event: 'SessionStart' | 'UserPromptSubmit';
  contextIncludes?: string[];
  contextExcludes?: string[];
}

export function assertHookEnvelope(
  parsed: HookResult,
  expectation: HookExpect,
): void {
  expect(parsed.continue).toBe(true);
  expect(parsed.hookEventName).toBe(expectation.event);
  expect(typeof parsed.additionalContext).toBe('string');
  const ctx = parsed.additionalContext ?? '';
  if (expectation.contextIncludes)
    for (const needle of expectation.contextIncludes)
      expect(ctx).toContain(needle);

  if (expectation.contextExcludes)
    for (const needle of expectation.contextExcludes)
      expect(ctx).not.toContain(needle);
}

export function parseToolCallText(content: unknown): unknown {
  if (!Array.isArray(content) || content.length === 0)
    throw new Error('callTool returned empty content');

  const first = content[0] as { type?: string; text?: string };
  if (first.type !== 'text' || typeof first.text !== 'string')
    throw new Error('callTool first content is not text');

  return JSON.parse(first.text);
}
