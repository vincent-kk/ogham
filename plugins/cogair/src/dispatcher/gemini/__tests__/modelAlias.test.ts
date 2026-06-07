import { afterEach, describe, expect, it } from 'vitest';

import { resolveGeminiModel } from '../operations/modelAlias.js';

const ENV_KEYS = [
  'COGAIR_GEMINI_HIGH',
  'COGAIR_GEMINI_MID',
  'COGAIR_GEMINI_LOW',
] as const;

describe('resolveGeminiModel', () => {
  const saved: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> =
    {};

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
      delete saved[key];
    }
  });

  function stub(key: (typeof ENV_KEYS)[number], value: string): void {
    saved[key] = process.env[key];
    process.env[key] = value;
  }

  it('returns the default high/mid/low aliases when env is unset', () => {
    for (const k of ENV_KEYS) delete process.env[k];
    expect(resolveGeminiModel('high')).toBe('pro');
    expect(resolveGeminiModel('mid')).toBe('flash');
    expect(resolveGeminiModel('low')).toBe('flash-lite');
  });

  it('honors env overrides', () => {
    stub('COGAIR_GEMINI_HIGH', 'custom-pro');
    stub('COGAIR_GEMINI_MID', 'custom-flash');
    stub('COGAIR_GEMINI_LOW', 'custom-lite');
    expect(resolveGeminiModel('high')).toBe('custom-pro');
    expect(resolveGeminiModel('mid')).toBe('custom-flash');
    expect(resolveGeminiModel('low')).toBe('custom-lite');
  });

  it('returns null for auto so dispatcher omits the -m flag', () => {
    expect(resolveGeminiModel('auto')).toBeNull();
  });
});
