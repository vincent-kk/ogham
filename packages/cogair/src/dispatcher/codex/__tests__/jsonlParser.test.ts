import { describe, expect, it } from 'vitest';

import { parseCodexStream } from '../jsonlParser/index.js';

describe('parseCodexStream', () => {
  it('returns nulls for an empty stream', () => {
    expect(parseCodexStream('')).toEqual({
      threadId: null,
      resolvedModel: null,
      response: null,
    });
  });

  it('extracts thread_id from a thread.started event', () => {
    const stdout = `${JSON.stringify({ type: 'thread.started', thread_id: 'abc-123' })}\n`;
    expect(parseCodexStream(stdout).threadId).toBe('abc-123');
  });

  it('falls back to session_id when thread_id is absent', () => {
    const stdout = `${JSON.stringify({ type: 'session_started', session_id: 'sess-456' })}\n`;
    expect(parseCodexStream(stdout).threadId).toBe('sess-456');
  });

  it('captures the latest agent_message text from item.completed events', () => {
    const events = [
      { type: 'thread.started', thread_id: 'tid' },
      {
        type: 'item.completed',
        item: { type: 'agent_message', text: 'first' },
      },
      {
        type: 'item.completed',
        item: { type: 'agent_message', text: 'second' },
      },
    ];
    const stdout = events.map((e) => JSON.stringify(e)).join('\n');
    expect(parseCodexStream(stdout).response).toBe('second');
  });

  it('also accepts older agent.message events', () => {
    const stdout =
      `${JSON.stringify({ type: 'thread.started', thread_id: 't' })}\n` +
      `${JSON.stringify({ type: 'agent.message', text: 'older shape' })}\n`;
    expect(parseCodexStream(stdout).response).toBe('older shape');
  });

  it('skips malformed JSON lines and continues parsing', () => {
    const stdout = [
      'this is not json',
      JSON.stringify({ type: 'thread.started', thread_id: 'tid' }),
      '{another-bad-line',
      JSON.stringify({
        type: 'item.completed',
        item: { type: 'agent_message', text: 'ok' },
      }),
    ].join('\n');
    const parsed = parseCodexStream(stdout);
    expect(parsed.threadId).toBe('tid');
    expect(parsed.response).toBe('ok');
  });

  it('reads model from a session_configured event when present', () => {
    const stdout =
      `${JSON.stringify({ type: 'session_configured', model: 'gpt-5-codex' })}\n` +
      `${JSON.stringify({ type: 'thread.started', thread_id: 't' })}\n`;
    expect(parseCodexStream(stdout).resolvedModel).toBe('gpt-5-codex');
  });

  it('reads identifiers from a nested msg envelope', () => {
    const stdout = `${JSON.stringify({ msg: { thread_id: 'nested-tid', model: 'mid-model' } })}\n`;
    const parsed = parseCodexStream(stdout);
    expect(parsed.threadId).toBe('nested-tid');
    expect(parsed.resolvedModel).toBe('mid-model');
  });
});
