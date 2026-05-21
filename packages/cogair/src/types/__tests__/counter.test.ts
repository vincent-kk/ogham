import { describe, expect, it } from 'vitest';

import { CounterSchema } from '../counter.js';

describe('CounterSchema', () => {
  it('parses a zero-initialized counter', () => {
    const counter = { parent_pid: 1234, gemini: 0, codex: 0 };
    expect(CounterSchema.parse(counter)).toEqual(counter);
  });

  it('rejects negative call counts', () => {
    expect(() =>
      CounterSchema.parse({ parent_pid: 1, gemini: -1, codex: 0 }),
    ).toThrow();
  });

  it('accepts negative parent_pid as fallback sentinel', () => {
    const counter = { parent_pid: -1, gemini: 3, codex: 2 };
    expect(CounterSchema.parse(counter)).toEqual(counter);
  });
});
