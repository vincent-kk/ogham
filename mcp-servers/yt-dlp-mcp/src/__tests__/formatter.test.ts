import { describe, expect, it } from 'vitest';

import { formatDuration, formatTimestamp, segmentsToText, truncate } from '../postprocess/formatter.js';

describe('formatTimestamp', () => {
  it('formats sub-hour as M:SS', () => {
    expect(formatTimestamp(0)).toBe('0:00');
    expect(formatTimestamp(65_000)).toBe('1:05');
  });

  it('formats hour+ as H:MM:SS', () => {
    expect(formatTimestamp(3_661_000)).toBe('1:01:01');
  });
});

describe('formatDuration', () => {
  it('formats seconds', () => {
    expect(formatDuration(212)).toBe('3:32');
  });
});

describe('segmentsToText', () => {
  const segs = [
    { text: 'Hello world', startMs: 0, durationMs: 1000 },
    { text: 'second line', startMs: 65_000, durationMs: 1000 },
  ];

  it('joins as prose by default', () => {
    expect(segmentsToText(segs)).toBe('Hello world second line');
  });

  it('emits one timestamped line each when requested', () => {
    expect(segmentsToText(segs, { timestamps: true })).toBe('[0:00] Hello world\n[1:05] second line');
  });
});

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
