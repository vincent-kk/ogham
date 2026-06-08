import { describe, expect, it } from 'vitest';

import {
  formatDuration,
  formatTimestamp,
} from '../postprocess/format-timestamp.js';

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
