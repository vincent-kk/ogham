import { afterEach, describe, expect, it } from 'vitest';

import { resolveCodexModel } from '../modelAlias.js';

const ENV_KEYS = [
  'COGAIR_CODEX_HIGH',
  'COGAIR_CODEX_MID',
  'COGAIR_CODEX_LOW',
] as const;

describe('resolveCodexModel', () => {
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

  it('returns the default high model when env is unset', () => {
    delete process.env.COGAIR_CODEX_HIGH;
    expect(resolveCodexModel('high')).toBe('gpt-5-codex');
  });

  it('returns the env-overridden high model when present', () => {
    stub('COGAIR_CODEX_HIGH', 'custom-high');
    expect(resolveCodexModel('high')).toBe('custom-high');
  });

  it('returns the default mid/low models when env is unset', () => {
    delete process.env.COGAIR_CODEX_MID;
    delete process.env.COGAIR_CODEX_LOW;
    expect(resolveCodexModel('mid')).toBe('gpt-5.1-codex');
    expect(resolveCodexModel('low')).toBe('o3');
  });

  it('returns null for auto so dispatcher omits the -m flag', () => {
    expect(resolveCodexModel('auto')).toBeNull();
  });
});
