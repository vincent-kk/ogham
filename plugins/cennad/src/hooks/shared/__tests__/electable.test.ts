import { describe, expect, it } from 'vitest';

import type { Ratio } from '../configTypes.js';
import { electableProviders } from '../electableProviders.js';
import { selfProvider } from '../selfProvider.js';

const ratio = (
  overrides: Partial<Record<keyof Ratio, Partial<Ratio[keyof Ratio]>>> = {},
): Ratio => ({
  codex: { value: 65, enabled: true, ...overrides.codex },
  antigravity: { value: 25, enabled: true, ...overrides.antigravity },
  claude: { value: 10, enabled: true, ...overrides.claude },
});

describe('selfProvider', () => {
  it('resolves an unmarked, signal-free env to claude', () => {
    expect(selfProvider({})).toBe('claude');
  });

  it('resolves the codex marker to codex', () => {
    expect(selfProvider({ OGHAM_HOST: 'codex' })).toBe('codex');
  });

  it('resolves the agy marker to the antigravity provider', () => {
    expect(selfProvider({ OGHAM_HOST: 'agy' })).toBe('antigravity');
  });

  it('falls back to the codex hook signal when no marker is present', () => {
    // hooks receive no marker; PLUGIN_DATA is Codex's measured hook-side signal
    expect(selfProvider({ PLUGIN_DATA: '/some/dir' })).toBe('codex');
  });

  it('falls back to the agy hook signal when no marker is present', () => {
    expect(selfProvider({ ANTIGRAVITY_CONVERSATION_ID: 'abc' })).toBe(
      'antigravity',
    );
  });
});

describe('electableProviders', () => {
  it('drops the host own provider while keeping the others in order', () => {
    expect(electableProviders(ratio(), 'claude')).toEqual([
      'codex',
      'antigravity',
    ]);
  });

  it('drops a provider marked crosscheck_only', () => {
    const r = ratio({ antigravity: { crosscheck_only: true } });
    expect(electableProviders(r, 'claude')).toEqual(['codex']);
  });

  it('drops disabled providers', () => {
    const r = ratio({ codex: { enabled: false } });
    expect(electableProviders(r, 'claude')).toEqual(['antigravity']);
  });

  it('returns an empty list when every provider is excluded', () => {
    const r = ratio({
      codex: { enabled: false },
      antigravity: { crosscheck_only: true },
    });
    expect(electableProviders(r, 'claude')).toEqual([]);
  });

  it('excludes codex instead when codex is the host', () => {
    expect(electableProviders(ratio(), 'codex')).toEqual([
      'antigravity',
      'claude',
    ]);
  });
});
