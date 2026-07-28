import { describe, expect, it } from 'vitest';

import type { AntigravityModelMap } from '../../../types/index.js';
import { resolveAntigravityModel } from '../operations/modelAlias.js';

const MAP: AntigravityModelMap = {
  apex: { model: 'Gemini 3.1 Pro', effort: 'High' },
  high: { model: 'Gemini 3.1 Pro', effort: 'Low' },
  mid: { model: 'Claude Sonnet 4.6', effort: 'Thinking' },
  low: { model: 'Gemini 3.5 Flash' },
};

describe('resolveAntigravityModel', () => {
  it('recomposes model and effort into agy\'s "model (effort)" name', () => {
    expect(resolveAntigravityModel('apex', MAP)).toBe('Gemini 3.1 Pro (High)');
    expect(resolveAntigravityModel('high', MAP)).toBe('Gemini 3.1 Pro (Low)');
    expect(resolveAntigravityModel('mid', MAP)).toBe(
      'Claude Sonnet 4.6 (Thinking)',
    );
  });

  it('omits the "(effort)" suffix when a tier has no effort', () => {
    expect(resolveAntigravityModel('low', MAP)).toBe('Gemini 3.5 Flash');
  });

  it('returns null when no model map is provided', () => {
    expect(resolveAntigravityModel('high', undefined)).toBeNull();
  });

  it('returns null when the tier maps to an empty or whitespace model', () => {
    expect(
      resolveAntigravityModel('high', {
        apex: { model: 'a' },
        high: { model: '' },
        mid: { model: 'x' },
        low: { model: 'y' },
      }),
    ).toBeNull();
    expect(
      resolveAntigravityModel('mid', {
        apex: { model: 'a' },
        high: { model: 'x' },
        mid: { model: '   ' },
        low: { model: 'y' },
      }),
    ).toBeNull();
  });

  // The settings page splits a catalog slug into base + variant, so config can hold
  // either half-form; the join has to follow the base's own spelling.
  it('rejoins a slug base with a hyphen, not parentheses', () => {
    const slugBases: AntigravityModelMap = {
      apex: { model: 'gemini-3.1-pro', effort: 'high' },
      high: { model: 'gemini-3.6-flash', effort: 'Medium' },
      mid: { model: 'gpt-oss-120b', effort: 'medium' },
      low: { model: 'gemini-3.5-flash', effort: 'low' },
    };
    expect(resolveAntigravityModel('apex', slugBases)).toBe(
      'gemini-3.1-pro-high',
    );
    expect(resolveAntigravityModel('high', slugBases)).toBe(
      'gemini-3.6-flash-medium',
    );
    expect(resolveAntigravityModel('mid', slugBases)).toBe(
      'gpt-oss-120b-medium',
    );
  });

  // `agy models` lists slugs that already carry the variant. Appending one turns
  // a valid name into "gemini-3.6-flash-medium (High)", which agy rejects.
  it('sends a catalog slug unchanged, never appending an effort', () => {
    const slugMap: AntigravityModelMap = {
      apex: { model: 'gemini-3.6-flash-high', effort: 'High' },
      high: { model: 'gemini-3.6-flash-medium', effort: 'High' },
      mid: { model: 'gemini-3.6-flash-medium', effort: 'Medium' },
      low: { model: 'gemini-3.5-flash-low' },
    };
    expect(resolveAntigravityModel('apex', slugMap)).toBe(
      'gemini-3.6-flash-high',
    );
    expect(resolveAntigravityModel('mid', slugMap)).toBe(
      'gemini-3.6-flash-medium',
    );
  });

  it('leaves an already-complete display name alone', () => {
    const map: AntigravityModelMap = {
      apex: { model: 'Gemini 3.1 Pro (High)', effort: 'Low' },
      high: { model: 'x' },
      mid: { model: 'x' },
      low: { model: 'x' },
    };
    expect(resolveAntigravityModel('apex', map)).toBe('Gemini 3.1 Pro (High)');
  });

  it('trims surrounding whitespace on model and effort', () => {
    expect(
      resolveAntigravityModel('high', {
        apex: { model: 'a' },
        high: { model: '  Gemini 3.1 Pro  ', effort: '  High  ' },
        mid: { model: 'x' },
        low: { model: 'y' },
      }),
    ).toBe('Gemini 3.1 Pro (High)');
  });
});
