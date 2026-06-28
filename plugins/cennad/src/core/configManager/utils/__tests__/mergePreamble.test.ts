import { describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG } from '../../../../constants/defaults.js';
import { mergePreamble } from '../mergePreamble.js';

const DEFAULTS = DEFAULT_CONFIG.preamble;

describe('mergePreamble', () => {
  it('returns default preamble when raw is undefined', () => {
    expect(mergePreamble(undefined)).toEqual(DEFAULTS);
  });

  it('preserves fully-specified preamble with all string providers', () => {
    const raw = { claude: 'be terse', codex: 'prefer ts', antigravity: 'agy' };
    expect(mergePreamble(raw)).toEqual(raw);
  });

  it('fills missing providers with defaults when raw is an empty object', () => {
    expect(mergePreamble({})).toEqual(DEFAULTS);
  });

  it('fills only missing providers when raw has a partial set', () => {
    const raw = { claude: 'custom claude' };
    const result = mergePreamble(raw);
    expect(result.claude).toBe('custom claude');
    expect(result.codex).toBe(DEFAULTS.codex);
    expect(result.antigravity).toBe(DEFAULTS.antigravity);
  });

  it('fills all providers when raw has only codex defined', () => {
    const raw = { codex: 'custom codex' };
    const result = mergePreamble(raw);
    expect(result.claude).toBe(DEFAULTS.claude);
    expect(result.codex).toBe('custom codex');
    expect(result.antigravity).toBe(DEFAULTS.antigravity);
  });

  it('fills all providers when raw has only antigravity defined', () => {
    const raw = { antigravity: 'custom agy' };
    const result = mergePreamble(raw);
    expect(result.claude).toBe(DEFAULTS.claude);
    expect(result.codex).toBe(DEFAULTS.codex);
    expect(result.antigravity).toBe('custom agy');
  });

  it('falls back to default for a provider whose value is a number', () => {
    const raw = { claude: 42, codex: 'valid', antigravity: 'valid' };
    const result = mergePreamble(raw);
    expect(result.claude).toBe(DEFAULTS.claude);
    expect(result.codex).toBe('valid');
    expect(result.antigravity).toBe('valid');
  });

  it('falls back to default for a provider whose value is null', () => {
    const raw = { claude: null, codex: 'valid', antigravity: 'valid' };
    const result = mergePreamble(raw);
    expect(result.claude).toBe(DEFAULTS.claude);
  });

  it('falls back to default for a provider whose value is a boolean', () => {
    const raw = { claude: true, codex: 'ok', antigravity: 'ok' };
    const result = mergePreamble(raw);
    expect(result.claude).toBe(DEFAULTS.claude);
  });

  it('falls back to default for a provider whose value is an object', () => {
    const raw = { claude: { nested: 'val' }, codex: 'ok', antigravity: 'ok' };
    const result = mergePreamble(raw);
    expect(result.claude).toBe(DEFAULTS.claude);
  });

  it('returns defaults when raw is null', () => {
    expect(mergePreamble(null)).toEqual(DEFAULTS);
  });

  it('returns defaults when raw is an array', () => {
    expect(mergePreamble(['claude', 'codex'])).toEqual(DEFAULTS);
  });

  it('returns defaults when raw is a string', () => {
    expect(mergePreamble('claude: custom')).toEqual(DEFAULTS);
  });

  it('returns defaults when raw is a number', () => {
    expect(mergePreamble(0)).toEqual(DEFAULTS);
  });

  it('accepts an empty string provider value as a valid override', () => {
    const raw = { claude: '', codex: '', antigravity: '' };
    expect(mergePreamble(raw)).toEqual({
      claude: '',
      codex: '',
      antigravity: '',
    });
  });
});
