import { describe, expect, it } from 'vitest';

import type { AntigravityModelMap } from '../../../types/index.js';
import { resolveAntigravityModel } from '../operations/modelAlias.js';

const MAP: AntigravityModelMap = {
  high: { model: 'Gemini 3.1 Pro', effort: 'High' },
  mid: { model: 'Claude Sonnet 4.6', effort: 'Thinking' },
  low: { model: 'Gemini 3.5 Flash' },
};

describe('resolveAntigravityModel', () => {
  it('recomposes model and effort into agy\'s "model (effort)" name', () => {
    expect(resolveAntigravityModel('high', MAP)).toBe('Gemini 3.1 Pro (High)');
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
        high: { model: '' },
        mid: { model: 'x' },
        low: { model: 'y' },
      }),
    ).toBeNull();
    expect(
      resolveAntigravityModel('mid', {
        high: { model: 'x' },
        mid: { model: '   ' },
        low: { model: 'y' },
      }),
    ).toBeNull();
  });

  it('trims surrounding whitespace on model and effort', () => {
    expect(
      resolveAntigravityModel('high', {
        high: { model: '  Gemini 3.1 Pro  ', effort: '  High  ' },
        mid: { model: 'x' },
        low: { model: 'y' },
      }),
    ).toBe('Gemini 3.1 Pro (High)');
  });
});
