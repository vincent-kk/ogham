import { describe, expect, it } from 'vitest';

import { normalizeMutualExclusion } from '../normalizeMutualExclusion.js';

describe('normalizeMutualExclusion', () => {
  it('disables gemini when both gemini and antigravity are enabled', () => {
    const input = {
      gemini: { value: 50, enabled: true },
      antigravity: { value: 50, enabled: true },
    };
    const result = normalizeMutualExclusion(input) as Record<string, unknown>;
    expect((result.gemini as Record<string, unknown>).enabled).toBe(false);
    expect((result.antigravity as Record<string, unknown>).enabled).toBe(true);
  });

  it('preserves other gemini fields when disabling gemini', () => {
    const input = {
      gemini: { value: 40, enabled: true },
      antigravity: { value: 60, enabled: true },
    };
    const result = normalizeMutualExclusion(input) as Record<string, unknown>;
    expect((result.gemini as Record<string, unknown>).value).toBe(40);
  });

  it('returns unchanged object when only gemini is enabled', () => {
    const input = {
      gemini: { value: 100, enabled: true },
      antigravity: { value: 50, enabled: false },
    };
    const result = normalizeMutualExclusion(input);
    expect(result).toBe(input);
  });

  it('returns unchanged object when only antigravity is enabled', () => {
    const input = {
      gemini: { value: 50, enabled: false },
      antigravity: { value: 50, enabled: true },
    };
    const result = normalizeMutualExclusion(input);
    expect(result).toBe(input);
  });

  it('returns unchanged object when neither gemini nor antigravity is enabled', () => {
    const input = {
      gemini: { value: 50, enabled: false },
      antigravity: { value: 50, enabled: false },
    };
    const result = normalizeMutualExclusion(input);
    expect(result).toBe(input);
  });

  it('leaves codex untouched when both gemini and antigravity are enabled', () => {
    const input = {
      gemini: { value: 40, enabled: true },
      antigravity: { value: 40, enabled: true },
      codex: { value: 60, enabled: true },
    };
    const result = normalizeMutualExclusion(input) as Record<string, unknown>;
    expect(result.codex).toEqual({ value: 60, enabled: true });
  });

  it('leaves codex untouched when neither condition triggers', () => {
    const input = {
      gemini: { value: 50, enabled: false },
      antigravity: { value: 50, enabled: false },
      codex: { value: 50, enabled: true },
    };
    const result = normalizeMutualExclusion(input) as Record<string, unknown>;
    expect(result.codex).toEqual({ value: 50, enabled: true });
  });

  it('returns non-object input as-is (null)', () => {
    expect(normalizeMutualExclusion(null)).toBeNull();
  });

  it('returns non-object input as-is (string)', () => {
    expect(normalizeMutualExclusion('config')).toBe('config');
  });

  it('returns array input as-is', () => {
    const arr = [1, 2, 3];
    expect(normalizeMutualExclusion(arr)).toBe(arr);
  });

  it('returns unchanged when gemini is not a plain object', () => {
    const input = {
      gemini: true,
      antigravity: { value: 50, enabled: true },
    };
    const result = normalizeMutualExclusion(input);
    expect(result).toBe(input);
  });

  it('returns unchanged when antigravity is not a plain object', () => {
    const input = {
      gemini: { value: 50, enabled: true },
      antigravity: null,
    };
    const result = normalizeMutualExclusion(input);
    expect(result).toBe(input);
  });

  it('returns unchanged when ratio has no gemini or antigravity keys', () => {
    const input = { codex: { value: 100, enabled: true } };
    const result = normalizeMutualExclusion(input);
    expect(result).toBe(input);
  });

  it('does not mutate the original input object', () => {
    const input = {
      gemini: { value: 50, enabled: true },
      antigravity: { value: 50, enabled: true },
    };
    const original = JSON.parse(JSON.stringify(input));
    normalizeMutualExclusion(input);
    expect(input).toEqual(original);
  });
});
