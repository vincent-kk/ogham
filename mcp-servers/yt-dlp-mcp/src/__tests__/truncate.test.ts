import { describe, expect, it } from 'vitest';

import { truncate } from '../postprocess/truncate.js';

describe('truncate', () => {
  it('leaves short text untouched', () => {
    expect(truncate('abc', 10)).toBe('abc');
  });

  it('cuts and appends a notice when over limit', () => {
    const out = truncate('a'.repeat(100), 20);
    expect(out.length).toBeLessThanOrEqual(20);
    expect(out).toContain('truncated');
  });
});
