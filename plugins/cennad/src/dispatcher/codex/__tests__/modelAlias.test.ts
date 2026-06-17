import { afterEach, describe, expect, it } from 'vitest';

import { resolveCodexModel } from '../operations/modelAlias.js';

const ENV_KEYS = [
  'CENNAD_CODEX_HIGH',
  'CENNAD_CODEX_MID',
  'CENNAD_CODEX_LOW',
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

  it('returns null for every tier when env is unset (lets codex-cli pick)', () => {
    for (const k of ENV_KEYS) delete process.env[k];
    expect(resolveCodexModel('high')).toBeNull();
    expect(resolveCodexModel('mid')).toBeNull();
    expect(resolveCodexModel('low')).toBeNull();
  });

  it('returns the env-overridden model when present', () => {
    stub('CENNAD_CODEX_HIGH', 'custom-high');
    stub('CENNAD_CODEX_MID', 'custom-mid');
    stub('CENNAD_CODEX_LOW', 'custom-low');
    expect(resolveCodexModel('high')).toBe('custom-high');
    expect(resolveCodexModel('mid')).toBe('custom-mid');
    expect(resolveCodexModel('low')).toBe('custom-low');
  });

  it('returns null for auto so dispatcher omits the -m flag', () => {
    expect(resolveCodexModel('auto')).toBeNull();
  });
});
