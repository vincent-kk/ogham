import { describe, expect, it } from 'vitest';

import { ConfigSchema } from '../../types/config.js';
import { DEFAULT_CONFIG, DIR_MODE, FILE_MODE } from '../defaults.js';

describe('DEFAULT_CONFIG', () => {
  it('is valid against ConfigSchema', () => {
    expect(() => ConfigSchema.parse(DEFAULT_CONFIG)).not.toThrow();
  });

  it('uses 1:1 ratio and neutral strength', () => {
    expect(DEFAULT_CONFIG.ratio).toEqual({ gemini: 1, codex: 1 });
    expect(DEFAULT_CONFIG.intervention_strength).toBe(0);
  });

  it('defaults to auto model and empty options', () => {
    expect(DEFAULT_CONFIG.default_model).toBe('auto');
    expect(DEFAULT_CONFIG.default_options).toEqual({});
  });

  it('defaults session TTL to 72 hours', () => {
    expect(DEFAULT_CONFIG.session_ttl_hours).toBe(72);
  });
});

describe('file modes', () => {
  it('uses 0o700 for directories and 0o600 for files', () => {
    expect(DIR_MODE).toBe(0o700);
    expect(FILE_MODE).toBe(0o600);
  });
});
