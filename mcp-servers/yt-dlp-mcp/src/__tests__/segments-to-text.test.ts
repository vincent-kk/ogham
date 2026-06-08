import { describe, expect, it } from 'vitest';

import { segmentsToText } from '../postprocess/segments-to-text.js';

describe('segmentsToText', () => {
  const segs = [
    { text: 'Hello world', startMs: 0, durationMs: 1000 },
    { text: 'second line', startMs: 65_000, durationMs: 1000 },
  ];

  it('joins as prose by default', () => {
    expect(segmentsToText(segs)).toBe('Hello world second line');
  });

  it('emits one timestamped line each when requested', () => {
    expect(segmentsToText(segs, { timestamps: true })).toBe(
      '[0:00] Hello world\n[1:05] second line',
    );
  });
});
