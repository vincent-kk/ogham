import { describe, expect, it } from 'vitest';

import { renderMarkdown } from '../utils/renderMarkdown.js';

describe('renderMarkdown', () => {
  it('emits YAML front-matter with all expected keys', () => {
    const out = renderMarkdown({
      sessionId: '11111111-1111-1111-1111-111111111111',
      provider: 'codex',
      model: 'gpt-5-codex',
      turn: 2,
      createdAt: '2026-05-22T10:00:00.000Z',
      elapsedMs: 1234,
      prompt: 'hello',
      response: 'world',
    });
    expect(out).toMatch(/^---\n/);
    expect(out).toContain('session_id: "11111111-1111-1111-1111-111111111111"');
    expect(out).toContain('provider: codex');
    expect(out).toContain('model: "gpt-5-codex"');
    expect(out).toContain('turn: 2');
    expect(out).toContain('created_at: "2026-05-22T10:00:00.000Z"');
    expect(out).toContain('elapsed_ms: 1234');
    expect(out).toContain('status: success');
  });

  it('includes prompt and response sections', () => {
    const out = renderMarkdown({
      sessionId: 'sid',
      provider: 'antigravity',
      model: 'Gemini 2.5 Pro',
      turn: 1,
      createdAt: '2026-05-22T10:00:00.000Z',
      elapsedMs: 0,
      prompt: 'what is X?',
      response: 'X is Y',
    });
    expect(out).toContain('## Prompt\n\nwhat is X?');
    expect(out).toContain('## Response\n\nX is Y');
  });

  it('terminates with a trailing newline', () => {
    const out = renderMarkdown({
      sessionId: 'sid',
      provider: 'codex',
      model: 'm',
      turn: 1,
      createdAt: 't',
      elapsedMs: 0,
      prompt: 'p',
      response: 'r',
    });
    expect(out.endsWith('\n')).toBe(true);
  });

  it('omits Composed Prompt section when composedPrompt equals raw prompt', () => {
    const out = renderMarkdown({
      sessionId: 'sid',
      provider: 'codex',
      model: 'm',
      turn: 1,
      createdAt: 't',
      elapsedMs: 0,
      prompt: 'p',
      composedPrompt: 'p',
      response: 'r',
    });
    expect(out.includes('Composed Prompt')).toBe(false);
  });

  it('includes Composed Prompt section when composedPrompt differs from raw', () => {
    const out = renderMarkdown({
      sessionId: 'sid',
      provider: 'antigravity',
      model: 'm',
      turn: 1,
      createdAt: 't',
      elapsedMs: 0,
      prompt: 'raw',
      composedPrompt: '<recency_policy>\nx\n</recency_policy>\n\nraw',
      response: 'r',
    });
    expect(out.includes('## Composed Prompt (sent to CLI)')).toBe(true);
    expect(out.includes('<recency_policy>')).toBe(true);
  });
});
