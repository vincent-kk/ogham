import { afterEach, describe, expect, it } from 'vitest';

import type { ClaudeModelMap } from '../../../types/index.js';
import { resolveClaudeTier } from '../operations/resolveTier.js';

const MAP: ClaudeModelMap = {
  high: { model: 'opus', effort: 'max' },
  mid: { model: 'sonnet', effort: 'high' },
  low: { model: 'haiku' },
};

const ENV_KEYS = [
  'CENNAD_CLAUDE_HIGH_MODEL',
  'CENNAD_CLAUDE_HIGH_EFFORT',
  'CENNAD_CLAUDE_LOW_MODEL',
];

describe('resolveClaudeTier', () => {
  afterEach(() => {
    for (const key of ENV_KEYS) delete process.env[key];
  });

  it('resolves a tier to its configured {model, effort}', () => {
    expect(resolveClaudeTier('high', MAP)).toEqual({
      model: 'opus',
      effort: 'max',
    });
  });

  it('omits effort for a model that has none configured (haiku)', () => {
    const resolved = resolveClaudeTier('low', MAP);
    expect(resolved.model).toBe('haiku');
    expect(resolved.effort).toBeUndefined();
  });

  it('lets env overrides take precedence over the map', () => {
    process.env.CENNAD_CLAUDE_HIGH_MODEL = 'sonnet';
    process.env.CENNAD_CLAUDE_HIGH_EFFORT = 'high';
    expect(resolveClaudeTier('high', MAP)).toEqual({
      model: 'sonnet',
      effort: 'high',
    });
  });

  it('falls back to opus when neither env nor map supplies a model', () => {
    expect(resolveClaudeTier('high', undefined)).toEqual({ model: 'opus' });
  });
});
