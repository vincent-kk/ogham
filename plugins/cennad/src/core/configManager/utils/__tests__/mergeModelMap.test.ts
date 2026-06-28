import { describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG } from '../../../../constants/defaults.js';
import { mergeModelMap } from '../mergeModelMap.js';

const defaults = DEFAULT_CONFIG.model_map;

describe('mergeModelMap', () => {
  it('returns defaults when raw is undefined', () => {
    expect(mergeModelMap(undefined)).toEqual(defaults);
  });

  it('returns defaults when raw is null', () => {
    expect(mergeModelMap(null)).toEqual(defaults);
  });

  it('preserves a fully-specified antigravity map and fills claude defaults', () => {
    const raw = {
      antigravity: { high: 'ModelA', mid: 'ModelB', low: 'ModelC' },
    };
    expect(mergeModelMap(raw)).toEqual({
      antigravity: { high: 'ModelA', mid: 'ModelB', low: 'ModelC' },
      claude: defaults.claude,
    });
  });

  it('fills missing antigravity tiers from defaults when only high is provided', () => {
    const raw = { antigravity: { high: 'CustomHigh' } };
    const result = mergeModelMap(raw) as typeof defaults;
    expect(result.antigravity.high).toBe('CustomHigh');
    expect(result.antigravity.mid).toBe(defaults.antigravity.mid);
    expect(result.antigravity.low).toBe(defaults.antigravity.low);
  });

  it('returns defaults when raw is a string', () => {
    expect(mergeModelMap('not-an-object')).toEqual(defaults);
  });

  it('returns defaults when raw is an array', () => {
    expect(mergeModelMap([{ antigravity: { high: 'X' } }])).toEqual(defaults);
  });

  it('uses default antigravity block when raw.antigravity is null', () => {
    const result = mergeModelMap({ antigravity: null }) as typeof defaults;
    expect(result.antigravity).toEqual(defaults.antigravity);
  });

  it('merges a fully-specified claude tier {model, effort}', () => {
    const raw = {
      claude: {
        high: { model: 'sonnet', effort: 'high' },
        mid: { model: 'opus', effort: 'medium' },
        low: { model: 'haiku' },
      },
    };
    const result = mergeModelMap(raw) as typeof defaults;
    expect(result.claude.high).toEqual({ model: 'sonnet', effort: 'high' });
    expect(result.claude.mid).toEqual({ model: 'opus', effort: 'medium' });
  });

  it('does not inherit default effort for a claude tier that omits effort', () => {
    const raw = { claude: { low: { model: 'haiku' } } };
    const result = mergeModelMap(raw) as typeof defaults;
    expect(result.claude.low).toEqual({ model: 'haiku' });
    expect(result.claude.low).not.toHaveProperty('effort');
  });

  it('fills missing claude tiers from defaults when only one tier is provided', () => {
    const raw = { claude: { high: { model: 'fable', effort: 'max' } } };
    const result = mergeModelMap(raw) as typeof defaults;
    expect(result.claude.high).toEqual({ model: 'fable', effort: 'max' });
    expect(result.claude.mid).toEqual(defaults.claude.mid);
    expect(result.claude.low).toEqual(defaults.claude.low);
  });

  it('falls back to the default claude tier when a tier lacks a string model', () => {
    const raw = { claude: { high: { effort: 'max' } } };
    const result = mergeModelMap(raw) as typeof defaults;
    expect(result.claude.high).toEqual(defaults.claude.high);
  });

  it('does not mutate DEFAULT_CONFIG.model_map', () => {
    const before = JSON.parse(JSON.stringify(defaults));
    mergeModelMap({ antigravity: { high: 'Mutator' } });
    expect(DEFAULT_CONFIG.model_map).toEqual(before);
  });
});
