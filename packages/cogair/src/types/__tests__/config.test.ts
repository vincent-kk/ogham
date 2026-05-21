import { describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG } from '../../constants/defaults.js';
import { ConfigSchema } from '../config.js';

describe('ConfigSchema', () => {
  it('accepts the default config', () => {
    expect(ConfigSchema.parse(DEFAULT_CONFIG)).toEqual(DEFAULT_CONFIG);
  });

  it('rejects intervention_strength outside [-2, +2]', () => {
    expect(() =>
      ConfigSchema.parse({ ...DEFAULT_CONFIG, intervention_strength: 3 }),
    ).toThrow();
  });

  it('rejects negative ratio values', () => {
    expect(() =>
      ConfigSchema.parse({
        ...DEFAULT_CONFIG,
        ratio: { gemini: -1, codex: 1 },
      }),
    ).toThrow();
  });

  it('rejects unknown default_model alias', () => {
    expect(() =>
      ConfigSchema.parse({ ...DEFAULT_CONFIG, default_model: 'ultra' }),
    ).toThrow();
  });

  it('requires positive session_ttl_hours', () => {
    expect(() =>
      ConfigSchema.parse({ ...DEFAULT_CONFIG, session_ttl_hours: 0 }),
    ).toThrow();
  });
});
