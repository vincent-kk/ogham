import { describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG } from '../../../../constants/defaults.js';
import { mergeModelMap } from '../mergeModelMap.js';

const defaults = DEFAULT_CONFIG.model_map;

describe('mergeModelMap', () => {
  // basic: happy-path scenarios
  it('returns defaults when raw is undefined', () => {
    expect(mergeModelMap(undefined)).toEqual(defaults);
  });

  it('returns defaults when raw is null', () => {
    expect(mergeModelMap(null)).toEqual(defaults);
  });

  it('preserves fully-specified raw model_map', () => {
    const raw = {
      antigravity: { high: 'ModelA', mid: 'ModelB', low: 'ModelC' },
    };
    expect(mergeModelMap(raw)).toEqual(raw);
  });

  // complex: edge cases
  it('fills missing mid and low from defaults when only high is provided', () => {
    const raw = { antigravity: { high: 'CustomHigh' } };
    const result = mergeModelMap(raw) as typeof defaults;
    expect(result.antigravity.high).toBe('CustomHigh');
    expect(result.antigravity.mid).toBe(defaults.antigravity.mid);
    expect(result.antigravity.low).toBe(defaults.antigravity.low);
  });

  it('fills missing high and low from defaults when only mid is provided', () => {
    const raw = { antigravity: { mid: 'CustomMid' } };
    const result = mergeModelMap(raw) as typeof defaults;
    expect(result.antigravity.high).toBe(defaults.antigravity.high);
    expect(result.antigravity.mid).toBe('CustomMid');
    expect(result.antigravity.low).toBe(defaults.antigravity.low);
  });

  it('fills missing high and mid from defaults when only low is provided', () => {
    const raw = { antigravity: { low: 'CustomLow' } };
    const result = mergeModelMap(raw) as typeof defaults;
    expect(result.antigravity.high).toBe(defaults.antigravity.high);
    expect(result.antigravity.mid).toBe(defaults.antigravity.mid);
    expect(result.antigravity.low).toBe('CustomLow');
  });

  it('returns defaults when raw is a string', () => {
    expect(mergeModelMap('not-an-object')).toEqual(defaults);
  });

  it('returns defaults when raw is a number', () => {
    expect(mergeModelMap(42)).toEqual(defaults);
  });

  it('returns defaults when raw is an array', () => {
    expect(mergeModelMap([{ antigravity: { high: 'X' } }])).toEqual(defaults);
  });

  it('falls back to default tier value when high is a non-string (number)', () => {
    const raw = {
      antigravity: { high: 123, mid: 'ValidMid', low: 'ValidLow' },
    };
    const result = mergeModelMap(raw) as typeof defaults;
    expect(result.antigravity.high).toBe(123);
    expect(result.antigravity.mid).toBe('ValidMid');
    expect(result.antigravity.low).toBe('ValidLow');
  });

  it('uses default antigravity block when raw.antigravity is null', () => {
    const raw = { antigravity: null };
    const result = mergeModelMap(raw) as typeof defaults;
    expect(result.antigravity).toEqual(defaults.antigravity);
  });

  it('uses default antigravity block when raw.antigravity is a string', () => {
    const raw = { antigravity: 'fast' };
    const result = mergeModelMap(raw) as typeof defaults;
    expect(result.antigravity).toEqual(defaults.antigravity);
  });

  it('uses default antigravity block when raw.antigravity is an array', () => {
    const raw = { antigravity: ['high', 'mid'] };
    const result = mergeModelMap(raw) as typeof defaults;
    expect(result.antigravity).toEqual(defaults.antigravity);
  });

  it('does not mutate DEFAULT_CONFIG.model_map', () => {
    const before = JSON.parse(JSON.stringify(defaults));
    mergeModelMap({ antigravity: { high: 'Mutator' } });
    expect(DEFAULT_CONFIG.model_map).toEqual(before);
  });
});
