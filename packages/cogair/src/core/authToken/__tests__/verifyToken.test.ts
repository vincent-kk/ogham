import { describe, expect, it } from 'vitest';

import { generateToken } from '../generateToken.js';
import { verifyToken } from '../verifyToken.js';

describe('verifyToken', () => {
  it('accepts identical strings', () => {
    const token = generateToken();
    expect(verifyToken(token, token)).toBe(true);
  });

  it('rejects different strings of equal length', () => {
    const a = '0'.repeat(32);
    const b = '1'.repeat(32);
    expect(verifyToken(a, b)).toBe(false);
  });

  it('rejects mismatched lengths without throwing', () => {
    expect(verifyToken('short', 'longer-string-value')).toBe(false);
    expect(verifyToken('longer-string-value', 'short')).toBe(false);
  });

  it('rejects empty against non-empty', () => {
    expect(verifyToken('', generateToken())).toBe(false);
  });

  it('accepts empty against empty', () => {
    expect(verifyToken('', '')).toBe(true);
  });
});
