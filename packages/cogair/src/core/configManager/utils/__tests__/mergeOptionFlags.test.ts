import { describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG } from '../../../../constants/defaults.js';
import { mergeOptionFlags } from '../mergeOptionFlags.js';

const defaults = DEFAULT_CONFIG.option_flags;

describe('mergeOptionFlags', () => {
  it('returns defaults when raw is undefined', () => {
    expect(mergeOptionFlags(undefined)).toEqual(defaults);
  });

  it('returns defaults when raw is null', () => {
    expect(mergeOptionFlags(null)).toEqual(defaults);
  });

  it('preserves fully-specified raw option_flags', () => {
    const raw = {
      gemini: { yolo: false, sandbox: false, sandbox_backend: 'docker' },
      codex: { yolo: true, sandbox: 'full' },
      antigravity: { sandbox: false, skip_permissions: true },
    };
    expect(mergeOptionFlags(raw)).toEqual(raw);
  });

  it('fills missing gemini sub-keys from defaults when only yolo is provided', () => {
    const raw = { gemini: { yolo: false } };
    const result = mergeOptionFlags(raw) as typeof defaults;
    expect(result.gemini.yolo).toBe(false);
    expect(result.gemini.sandbox).toBe(defaults.gemini.sandbox);
    expect(result.gemini.sandbox_backend).toBe(defaults.gemini.sandbox_backend);
  });

  it('fills missing gemini sub-keys from defaults when only sandbox is provided', () => {
    const raw = { gemini: { sandbox: false } };
    const result = mergeOptionFlags(raw) as typeof defaults;
    expect(result.gemini.yolo).toBe(defaults.gemini.yolo);
    expect(result.gemini.sandbox).toBe(false);
    expect(result.gemini.sandbox_backend).toBe(defaults.gemini.sandbox_backend);
  });

  it('fills missing gemini sub-keys from defaults when only sandbox_backend is provided', () => {
    const raw = { gemini: { sandbox_backend: 'docker' } };
    const result = mergeOptionFlags(raw) as typeof defaults;
    expect(result.gemini.yolo).toBe(defaults.gemini.yolo);
    expect(result.gemini.sandbox).toBe(defaults.gemini.sandbox);
    expect(result.gemini.sandbox_backend).toBe('docker');
  });

  it('defaults codex block independently when only gemini is provided', () => {
    const raw = {
      gemini: { yolo: false, sandbox: false, sandbox_backend: 'none' },
    };
    const result = mergeOptionFlags(raw) as typeof defaults;
    expect(result.codex).toEqual(defaults.codex);
  });

  it('defaults antigravity block independently when only codex is provided', () => {
    const raw = { codex: { yolo: true, sandbox: 'full' } };
    const result = mergeOptionFlags(raw) as typeof defaults;
    expect(result.antigravity).toEqual(defaults.antigravity);
  });

  it('defaults gemini block independently when only antigravity is provided', () => {
    const raw = { antigravity: { sandbox: false, skip_permissions: true } };
    const result = mergeOptionFlags(raw) as typeof defaults;
    expect(result.gemini).toEqual(defaults.gemini);
  });

  it('drops unknown keys that are not gemini/codex/antigravity', () => {
    const raw = {
      gemini: { yolo: true, sandbox: true, sandbox_backend: 'auto' },
      codex: { yolo: false, sandbox: 'workspace-write' },
      antigravity: { sandbox: true, skip_permissions: false },
      legacy_provider: { some_flag: true },
    };
    const result = mergeOptionFlags(raw) as Record<string, unknown>;
    expect(result).not.toHaveProperty('legacy_provider');
  });

  it('returns defaults when raw is a string', () => {
    expect(mergeOptionFlags('not-an-object')).toEqual(defaults);
  });

  it('uses default gemini block when raw.gemini is null', () => {
    const raw = { gemini: null };
    const result = mergeOptionFlags(raw) as typeof defaults;
    expect(result.gemini).toEqual(defaults.gemini);
  });

  it('uses default codex block when raw.codex is a string', () => {
    const raw = { codex: 'invalid' };
    const result = mergeOptionFlags(raw) as typeof defaults;
    expect(result.codex).toEqual(defaults.codex);
  });

  it('uses default antigravity block when raw.antigravity is an array', () => {
    const raw = { antigravity: ['sandbox'] };
    const result = mergeOptionFlags(raw) as typeof defaults;
    expect(result.antigravity).toEqual(defaults.antigravity);
  });

  it('does not mutate DEFAULT_CONFIG.option_flags', () => {
    const before = JSON.parse(JSON.stringify(defaults));
    mergeOptionFlags({ gemini: { yolo: false } });
    expect(DEFAULT_CONFIG.option_flags).toEqual(before);
  });
});
