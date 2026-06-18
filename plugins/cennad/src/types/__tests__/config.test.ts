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

  it('requires positive session_ttl_hours', () => {
    expect(() =>
      ConfigSchema.parse({ ...DEFAULT_CONFIG, session_ttl_hours: 0 }),
    ).toThrow();
  });

  it('rejects unknown gemini sandbox_backend', () => {
    expect(() =>
      ConfigSchema.parse({
        ...DEFAULT_CONFIG,
        option_flags: {
          ...DEFAULT_CONFIG.option_flags,
          gemini: {
            ...DEFAULT_CONFIG.option_flags.gemini,
            sandbox_backend: 'firejail',
          },
        },
      }),
    ).toThrow();
  });

  it('rejects unknown codex sandbox mode', () => {
    expect(() =>
      ConfigSchema.parse({
        ...DEFAULT_CONFIG,
        option_flags: {
          ...DEFAULT_CONFIG.option_flags,
          codex: { yolo: false, sandbox: 'whatever' },
        },
      }),
    ).toThrow();
  });

  it('rejects missing option_flags', () => {
    const { option_flags: _omit, ...rest } = DEFAULT_CONFIG;
    void _omit;
    expect(() => ConfigSchema.parse(rest)).toThrow();
  });

  it('rejects unknown recency level', () => {
    expect(() =>
      ConfigSchema.parse({
        ...DEFAULT_CONFIG,
        recency_factor: {
          gemini: 'aggressive',
          codex: 'off',
          antigravity: 'auto',
        },
      }),
    ).toThrow();
  });

  it('rejects non-string preamble', () => {
    expect(() =>
      ConfigSchema.parse({
        ...DEFAULT_CONFIG,
        preamble: { gemini: 123, codex: '', antigravity: '' },
      }),
    ).toThrow();
  });

  it('accepts each recency level value', () => {
    for (const level of ['off', 'auto', 'strict'] as const) {
      expect(() =>
        ConfigSchema.parse({
          ...DEFAULT_CONFIG,
          recency_factor: { gemini: level, codex: level, antigravity: level },
        }),
      ).not.toThrow();
    }
  });

  it('rejects missing default_tier', () => {
    const { default_tier: _omit, ...rest } = DEFAULT_CONFIG;
    void _omit;
    expect(() => ConfigSchema.parse(rest)).toThrow();
  });

  it('rejects an unknown tier value in default_tier (no auto)', () => {
    expect(() =>
      ConfigSchema.parse({
        ...DEFAULT_CONFIG,
        default_tier: { gemini: 'auto', codex: 'mid', antigravity: 'mid' },
      }),
    ).toThrow();
  });
});
