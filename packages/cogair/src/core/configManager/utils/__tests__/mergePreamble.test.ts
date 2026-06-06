import { describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG } from '../../../../constants/defaults.js';
import { mergePreamble } from '../mergePreamble.js';

const DEFAULTS = DEFAULT_CONFIG.preamble;

describe('mergePreamble', () => {
  it('returns default preamble when raw is undefined', () => {
    expect(mergePreamble(undefined)).toEqual(DEFAULTS);
  });

  it('preserves fully-specified preamble with all string providers', () => {
    const raw = { gemini: 'be terse', codex: 'prefer ts', antigravity: 'agy' };
    expect(mergePreamble(raw)).toEqual(raw);
  });

  it('fills missing providers with defaults when raw is an empty object', () => {
    expect(mergePreamble({})).toEqual(DEFAULTS);
  });

  it('fills only missing providers when raw has a partial set', () => {
    const raw = { gemini: 'custom gemini' };
    const result = mergePreamble(raw);
    expect(result.gemini).toBe('custom gemini');
    expect(result.codex).toBe(DEFAULTS.codex);
    expect(result.antigravity).toBe(DEFAULTS.antigravity);
  });

  it('fills all providers when raw has only codex defined', () => {
    const raw = { codex: 'custom codex' };
    const result = mergePreamble(raw);
    expect(result.gemini).toBe(DEFAULTS.gemini);
    expect(result.codex).toBe('custom codex');
    expect(result.antigravity).toBe(DEFAULTS.antigravity);
  });

  it('fills all providers when raw has only antigravity defined', () => {
    const raw = { antigravity: 'custom agy' };
    const result = mergePreamble(raw);
    expect(result.gemini).toBe(DEFAULTS.gemini);
    expect(result.codex).toBe(DEFAULTS.codex);
    expect(result.antigravity).toBe('custom agy');
  });

  it('falls back to default for a provider whose value is a number', () => {
    const raw = { gemini: 42, codex: 'valid', antigravity: 'valid' };
    const result = mergePreamble(raw);
    expect(result.gemini).toBe(DEFAULTS.gemini);
    expect(result.codex).toBe('valid');
    expect(result.antigravity).toBe('valid');
  });

  it('falls back to default for a provider whose value is null', () => {
    const raw = { gemini: null, codex: 'valid', antigravity: 'valid' };
    const result = mergePreamble(raw);
    expect(result.gemini).toBe(DEFAULTS.gemini);
  });

  it('falls back to default for a provider whose value is a boolean', () => {
    const raw = { gemini: true, codex: 'ok', antigravity: 'ok' };
    const result = mergePreamble(raw);
    expect(result.gemini).toBe(DEFAULTS.gemini);
  });

  it('falls back to default for a provider whose value is an object', () => {
    const raw = { gemini: { nested: 'val' }, codex: 'ok', antigravity: 'ok' };
    const result = mergePreamble(raw);
    expect(result.gemini).toBe(DEFAULTS.gemini);
  });

  it('returns defaults when raw is null', () => {
    expect(mergePreamble(null)).toEqual(DEFAULTS);
  });

  it('returns defaults when raw is an array', () => {
    expect(mergePreamble(['gemini', 'codex'])).toEqual(DEFAULTS);
  });

  it('returns defaults when raw is a string', () => {
    expect(mergePreamble('gemini: custom')).toEqual(DEFAULTS);
  });

  it('returns defaults when raw is a number', () => {
    expect(mergePreamble(0)).toEqual(DEFAULTS);
  });

  it('accepts an empty string provider value as a valid override', () => {
    const raw = { gemini: '', codex: '', antigravity: '' };
    expect(mergePreamble(raw)).toEqual({
      gemini: '',
      codex: '',
      antigravity: '',
    });
  });
});
