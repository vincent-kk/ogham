import { describe, expect, it } from 'vitest';

import { strengthLabel } from '../utils/strengthLabel.js';

describe('strengthLabel', () => {
  it('returns subtle for strength -2', () => {
    expect(strengthLabel(-2)).toBe('subtle');
  });

  it('returns soft for strength -1', () => {
    expect(strengthLabel(-1)).toBe('soft');
  });

  it('returns neutral for strength 0', () => {
    expect(strengthLabel(0)).toBe('neutral');
  });

  it('returns active for strength 1', () => {
    expect(strengthLabel(1)).toBe('active');
  });

  it('returns strong for strength 2', () => {
    expect(strengthLabel(2)).toBe('strong');
  });
});
