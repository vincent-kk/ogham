import { describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG } from '../../../../constants/defaults.js';
import { mergeDefaultTier } from '../mergeDefaultTier.js';

const defaults = DEFAULT_CONFIG.default_tier;

describe('mergeDefaultTier', () => {
  it('returns defaults when raw is undefined', () => {
    expect(mergeDefaultTier(undefined)).toEqual(defaults);
  });

  it('preserves a fully-specified raw default_tier', () => {
    const raw = { codex: 'low', antigravity: 'high', claude: 'high' };
    expect(mergeDefaultTier(raw)).toEqual(raw);
  });

  it('fills missing providers from defaults when only codex is provided', () => {
    const raw = { codex: 'high' };
    const result = mergeDefaultTier(raw) as typeof defaults;
    expect(result.codex).toBe('high');
    expect(result.antigravity).toBe(defaults.antigravity);
    expect(result.claude).toBe(defaults.claude);
  });

  it('returns defaults when raw is null', () => {
    expect(mergeDefaultTier(null)).toEqual(defaults);
  });

  it('returns defaults when raw is a string', () => {
    expect(mergeDefaultTier('mid')).toEqual(defaults);
  });

  it('returns defaults when raw is a number', () => {
    expect(mergeDefaultTier(3)).toEqual(defaults);
  });

  it('returns defaults when raw is an array', () => {
    expect(mergeDefaultTier(['high'])).toEqual(defaults);
  });

  it('passes an invalid tier string through for the schema to reject', () => {
    const raw = { codex: 'auto', antigravity: 'mid', claude: 'mid' };
    const result = mergeDefaultTier(raw) as typeof defaults;
    expect(result.codex).toBe('auto');
  });

  it('does not mutate DEFAULT_CONFIG.default_tier', () => {
    const before = JSON.parse(JSON.stringify(defaults));
    mergeDefaultTier({ codex: 'high' });
    expect(DEFAULT_CONFIG.default_tier).toEqual(before);
  });
});
