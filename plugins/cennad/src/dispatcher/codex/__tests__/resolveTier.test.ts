import { afterEach, describe, expect, it } from 'vitest';

import type { CodexModelMap } from '../../../types/index.js';
import { resolveCodexTier } from '../operations/resolveTier.js';

const MAP: CodexModelMap = {
  high: { model: 'gpt-5.6-sol', effort: 'max' },
  mid: { model: 'gpt-5.6-terra', effort: 'medium' },
  low: { model: 'gpt-5.6-luna', effort: 'medium' },
};

const ENV_KEYS = [
  'CENNAD_CODEX_HIGH_MODEL',
  'CENNAD_CODEX_HIGH_EFFORT',
  'CENNAD_CODEX_MID_MODEL',
  'CENNAD_CODEX_MID_EFFORT',
];

afterEach(() => {
  for (const key of ENV_KEYS) delete process.env[key];
});

describe('resolveCodexTier', () => {
  it('resolves each tier to its configured model and effort', () => {
    expect(resolveCodexTier('high', MAP)).toEqual({
      model: 'gpt-5.6-sol',
      effort: 'max',
    });
    expect(resolveCodexTier('mid', MAP)).toEqual({
      model: 'gpt-5.6-terra',
      effort: 'medium',
    });
    expect(resolveCodexTier('low', MAP)).toEqual({
      model: 'gpt-5.6-luna',
      effort: 'medium',
    });
  });

  it('resolves to nothing without a map, leaving ~/.codex/config.toml in charge', () => {
    expect(resolveCodexTier('high', undefined)).toEqual({});
  });

  it('omits effort when a tier configures a model only', () => {
    const map: CodexModelMap = { ...MAP, high: { model: 'gpt-5.5' } };
    expect(resolveCodexTier('high', map)).toEqual({ model: 'gpt-5.5' });
  });

  it('omits a blank model so codex keeps its own default', () => {
    const map: CodexModelMap = {
      ...MAP,
      high: { model: '   ', effort: 'high' },
    };
    expect(resolveCodexTier('high', map)).toEqual({ effort: 'high' });
  });

  it('lets env overrides win over the config map', () => {
    process.env.CENNAD_CODEX_HIGH_MODEL = 'gpt-5.6-luna';
    process.env.CENNAD_CODEX_HIGH_EFFORT = 'xhigh';
    expect(resolveCodexTier('high', MAP)).toEqual({
      model: 'gpt-5.6-luna',
      effort: 'xhigh',
    });
  });

  it('applies an env override even with no map at all', () => {
    process.env.CENNAD_CODEX_MID_EFFORT = 'ultra';
    expect(resolveCodexTier('mid', undefined)).toEqual({ effort: 'ultra' });
  });
});
