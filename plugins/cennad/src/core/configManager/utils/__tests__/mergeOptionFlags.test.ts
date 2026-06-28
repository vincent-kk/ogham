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
      codex: { yolo: true, sandbox: 'full' },
      antigravity: { sandbox: false, skip_permissions: true },
      claude: { permission_mode: 'auto' },
    };
    expect(mergeOptionFlags(raw)).toEqual(raw);
  });

  it('fills missing codex sub-keys from defaults when only yolo is provided', () => {
    const raw = { codex: { yolo: true } };
    const result = mergeOptionFlags(raw) as typeof defaults;
    expect(result.codex.yolo).toBe(true);
    expect(result.codex.sandbox).toBe(defaults.codex.sandbox);
  });

  it('defaults antigravity block independently when only codex is provided', () => {
    const raw = { codex: { yolo: true, sandbox: 'full' } };
    const result = mergeOptionFlags(raw) as typeof defaults;
    expect(result.antigravity).toEqual(defaults.antigravity);
  });

  it('defaults claude block independently when only codex is provided', () => {
    const raw = { codex: { yolo: true, sandbox: 'full' } };
    const result = mergeOptionFlags(raw) as typeof defaults;
    expect(result.claude).toEqual(defaults.claude);
  });

  it('merges a claude fallback_model onto the permission_mode', () => {
    const raw = {
      claude: { permission_mode: 'auto', fallback_model: 'sonnet' },
    };
    const result = mergeOptionFlags(raw) as typeof defaults;
    expect(result.claude).toEqual({
      permission_mode: 'auto',
      fallback_model: 'sonnet',
    });
  });

  it('drops unknown keys that are not codex/antigravity/claude', () => {
    const raw = {
      codex: { yolo: false, sandbox: 'workspace-write' },
      antigravity: { sandbox: true, skip_permissions: false },
      claude: { permission_mode: 'acceptEdits' },
      legacy_provider: { some_flag: true },
    };
    const result = mergeOptionFlags(raw) as Record<string, unknown>;
    expect(result).not.toHaveProperty('legacy_provider');
  });

  it('returns defaults when raw is a string', () => {
    expect(mergeOptionFlags('not-an-object')).toEqual(defaults);
  });

  it('uses default codex block when raw.codex is a string', () => {
    const result = mergeOptionFlags({ codex: 'invalid' }) as typeof defaults;
    expect(result.codex).toEqual(defaults.codex);
  });

  it('uses default antigravity block when raw.antigravity is an array', () => {
    const result = mergeOptionFlags({
      antigravity: ['sandbox'],
    }) as typeof defaults;
    expect(result.antigravity).toEqual(defaults.antigravity);
  });

  it('uses default claude block when raw.claude is null', () => {
    const result = mergeOptionFlags({ claude: null }) as typeof defaults;
    expect(result.claude).toEqual(defaults.claude);
  });

  it('does not mutate DEFAULT_CONFIG.option_flags', () => {
    const before = JSON.parse(JSON.stringify(defaults));
    mergeOptionFlags({ codex: { yolo: true } });
    expect(DEFAULT_CONFIG.option_flags).toEqual(before);
  });
});
