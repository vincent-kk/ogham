import { describe, expect, it } from 'vitest';

import { mapReplacer } from '../mapReplacer.js';

describe('mapReplacer', () => {
  it('converts Map and Set to JSON-friendly shapes', () => {
    const m = new Map([['a', 1]]);
    const s = new Set([1, 2, 3]);
    expect(JSON.parse(JSON.stringify({ m, s }, mapReplacer))).toEqual({
      m: { a: 1 },
      s: [1, 2, 3],
    });
  });
});
