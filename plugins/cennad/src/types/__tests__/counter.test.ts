import { describe, expect, it } from 'vitest';

import { CounterSchema } from '../counter.js';

describe('CounterSchema', () => {
  it('parses a zero-initialized counter', () => {
    const counter = {
      host_session_id: 'codex-session',
      codex: 0,
      antigravity: 0,
      claude: 0,
    };
    expect(CounterSchema.parse(counter)).toEqual(counter);
  });

  it('rejects negative call counts', () => {
    expect(() =>
      CounterSchema.parse({
        host_session_id: 'codex-session',
        codex: 0,
        antigravity: 0,
        claude: -1,
      }),
    ).toThrow();
  });

  it('migrates a positive legacy parent_pid to the Claude identity', () => {
    expect(
      CounterSchema.parse({
        parent_pid: 1234,
        codex: 2,
        antigravity: 1,
        claude: 3,
      }),
    ).toEqual({
      host_session_id: 'claude-pid:1234',
      codex: 2,
      antigravity: 1,
      claude: 3,
    });
  });

  it('rejects blank current identities and legacy fallback sentinels', () => {
    expect(() =>
      CounterSchema.parse({
        host_session_id: ' ',
        codex: 0,
        antigravity: 0,
        claude: 0,
      }),
    ).toThrow();
    expect(() =>
      CounterSchema.parse({
        parent_pid: -1,
        codex: 0,
        antigravity: 0,
        claude: 0,
      }),
    ).toThrow();
  });
});
