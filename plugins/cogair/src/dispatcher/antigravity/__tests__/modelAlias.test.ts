import { describe, expect, it } from 'vitest';

import type { TierModelMap } from '../../../types/index.js';
import { resolveAntigravityModel } from '../operations/modelAlias.js';

const MAP: TierModelMap = {
  high: 'Gemini 3.1 Pro',
  mid: 'Claude Sonnet 4.5',
  low: 'Gemini 3.5 Flash',
};

describe('resolveAntigravityModel', () => {
  it('returns the mapped model full-name for each concrete tier', () => {
    expect(resolveAntigravityModel('high', MAP)).toBe('Gemini 3.1 Pro');
    expect(resolveAntigravityModel('mid', MAP)).toBe('Claude Sonnet 4.5');
    expect(resolveAntigravityModel('low', MAP)).toBe('Gemini 3.5 Flash');
  });

  it('returns null for auto so the dispatcher omits the model flag', () => {
    expect(resolveAntigravityModel('auto', MAP)).toBeNull();
  });

  it('returns null when no model map is provided', () => {
    expect(resolveAntigravityModel('high', undefined)).toBeNull();
  });

  it('returns null when the tier maps to an empty or whitespace name', () => {
    expect(
      resolveAntigravityModel('high', { high: '', mid: 'x', low: 'y' }),
    ).toBeNull();
    expect(
      resolveAntigravityModel('mid', { high: 'x', mid: '   ', low: 'y' }),
    ).toBeNull();
  });
});
