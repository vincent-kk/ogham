import { describe, expect, it } from 'vitest';

import { parseJson3 } from '../ytdlp/operations/parse-json3.js';
import { SAMPLE_JSON3 } from './helpers/fixtures.js';

describe('parseJson3', () => {
  it('joins segs and computes timing', () => {
    const segs = parseJson3(SAMPLE_JSON3);
    expect(segs).toHaveLength(3);
    expect(segs[0]).toEqual({ text: 'Hello world', startMs: 0, durationMs: 1500 });
    expect(segs[1].text).toBe('this is a test');
  });

  it('drops whitespace-only events', () => {
    const segs = parseJson3(SAMPLE_JSON3);
    expect(segs.some((s) => s.text.trim() === '')).toBe(false);
  });

  it('returns [] on malformed JSON', () => {
    expect(parseJson3('not json')).toEqual([]);
  });

  it('returns [] when events are missing', () => {
    expect(parseJson3(JSON.stringify({}))).toEqual([]);
  });

  it('rounds fractional timings to integers', () => {
    const doc = JSON.stringify({ events: [{ tStartMs: 10.7, dDurationMs: 99.4, segs: [{ utf8: 'x' }] }] });
    expect(parseJson3(doc)[0]).toEqual({ text: 'x', startMs: 11, durationMs: 99 });
  });
});
