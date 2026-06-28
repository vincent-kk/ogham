import { describe, expect, it } from 'vitest';

import { CounterSchema } from '../counter.js';

describe('CounterSchema', () => {
  it('parses a zero-initialized counter', () => {
    const counter = { parent_pid: 1234, codex: 0, antigravity: 0, claude: 0 };
    expect(CounterSchema.parse(counter)).toEqual(counter);
  });

  it('rejects negative call counts', () => {
    expect(() =>
      CounterSchema.parse({
        parent_pid: 1,
        codex: 0,
        antigravity: 0,
        claude: -1,
      }),
    ).toThrow();
  });

  it('accepts negative parent_pid as fallback sentinel', () => {
    const counter = { parent_pid: -1, codex: 2, antigravity: 1, claude: 3 };
    expect(CounterSchema.parse(counter)).toEqual(counter);
  });
});
