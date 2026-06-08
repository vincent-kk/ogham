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

  it('guarantees output length stays within the limit with the notice', () => {
    const out = truncate('b'.repeat(100), 30);
    expect(out.length).toBeLessThanOrEqual(30);
    expect(out.endsWith('… [truncated]')).toBe(true);
  });

  it('never exceeds the limit even when the notice is longer than it', () => {
    const out = truncate('a'.repeat(50), 5);
    expect(out.length).toBeLessThanOrEqual(5);
  });

  it('does not leave a lone high surrogate when cutting mid-emoji', () => {
    const out = truncate('😀😀😀😀😀', 6, 'X');
    expect(out).toBe('😀😀X');
    const lastUnit = out.charCodeAt(out.length - 1);
    expect(lastUnit < 0xd800 || lastUnit > 0xdbff).toBe(true);
  });

  it('keeps valid UTF-16 when the notice overflows the limit mid-emoji', () => {
    const out = truncate('😀😀😀', 3);
    expect(out).toBe('😀');
    expect(out.length).toBeLessThanOrEqual(3);
  });
});
