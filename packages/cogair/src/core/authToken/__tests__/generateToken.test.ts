import { describe, expect, it } from 'vitest';

import { generateToken } from '../generateToken.js';

describe('generateToken', () => {
  it('returns 32 hex characters (16 bytes)', () => {
    expect(generateToken()).toMatch(/^[0-9a-f]{32}$/);
  });

  it('produces a different value on each call', () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 100; i += 1) tokens.add(generateToken());
    expect(tokens.size).toBe(100);
  });
});
