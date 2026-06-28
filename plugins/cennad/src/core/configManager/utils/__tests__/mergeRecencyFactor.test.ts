import { describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG } from '../../../../constants/defaults.js';
import { mergeRecencyFactor } from '../mergeRecencyFactor.js';

const DEFAULTS = DEFAULT_CONFIG.recency_factor;

describe('mergeRecencyFactor', () => {
  it('returns defaults when raw is undefined', () => {
    expect(mergeRecencyFactor(undefined)).toEqual(DEFAULTS);
  });

  it('returns defaults when raw is null', () => {
    expect(mergeRecencyFactor(null)).toEqual(DEFAULTS);
  });

  it('returns defaults when raw is a string', () => {
    expect(mergeRecencyFactor('auto')).toEqual(DEFAULTS);
  });

  it('returns defaults when raw is an array', () => {
    expect(mergeRecencyFactor([])).toEqual(DEFAULTS);
  });

  it('returns defaults when raw is a number', () => {
    expect(mergeRecencyFactor(42)).toEqual(DEFAULTS);
  });

  it('preserves all three valid levels when all providers are specified', () => {
    expect(
      mergeRecencyFactor({
        claude: 'off',
        codex: 'strict',
        antigravity: 'auto',
      }),
    ).toEqual({ claude: 'off', codex: 'strict', antigravity: 'auto' });
  });

  it('preserves off level for each provider', () => {
    const result = mergeRecencyFactor({
      claude: 'off',
      codex: 'off',
      antigravity: 'off',
    });
    expect(result).toEqual({ claude: 'off', codex: 'off', antigravity: 'off' });
  });

  it('preserves strict level for each provider', () => {
    const result = mergeRecencyFactor({
      claude: 'strict',
      codex: 'strict',
      antigravity: 'strict',
    });
    expect(result).toEqual({
      claude: 'strict',
      codex: 'strict',
      antigravity: 'strict',
    });
  });

  it('falls back to claude default when claude level is invalid', () => {
    const result = mergeRecencyFactor({
      claude: 'aggressive',
      codex: 'strict',
      antigravity: 'auto',
    });
    expect(result.claude).toBe(DEFAULTS.claude);
    expect(result.codex).toBe('strict');
    expect(result.antigravity).toBe('auto');
  });

  it('falls back to codex default when codex level is invalid', () => {
    const result = mergeRecencyFactor({
      claude: 'auto',
      codex: 'always',
      antigravity: 'strict',
    });
    expect(result.codex).toBe(DEFAULTS.codex);
    expect(result.claude).toBe('auto');
    expect(result.antigravity).toBe('strict');
  });

  it('falls back to antigravity default when antigravity level is invalid', () => {
    const result = mergeRecencyFactor({
      claude: 'off',
      codex: 'off',
      antigravity: 123,
    });
    expect(result.antigravity).toBe(DEFAULTS.antigravity);
    expect(result.claude).toBe('off');
    expect(result.codex).toBe('off');
  });

  it('fills missing claude with default when omitted from partial raw', () => {
    const result = mergeRecencyFactor({ codex: 'strict', antigravity: 'off' });
    expect(result.claude).toBe(DEFAULTS.claude);
    expect(result.codex).toBe('strict');
    expect(result.antigravity).toBe('off');
  });

  it('fills missing codex with default when omitted from partial raw', () => {
    const result = mergeRecencyFactor({ claude: 'strict' });
    expect(result.codex).toBe(DEFAULTS.codex);
    expect(result.claude).toBe('strict');
    expect(result.antigravity).toBe(DEFAULTS.antigravity);
  });

  it('fills all providers with defaults when raw is an empty object', () => {
    expect(mergeRecencyFactor({})).toEqual(DEFAULTS);
  });

  it('returns a new object (does not mutate defaults)', () => {
    const result = mergeRecencyFactor(undefined);
    expect(result).not.toBe(DEFAULTS);
  });
});
