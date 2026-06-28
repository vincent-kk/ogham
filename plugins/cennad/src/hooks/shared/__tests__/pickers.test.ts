import { describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG } from '../../../constants/defaults.js';
import { pickKeywords } from '../pickKeywords.js';
import { pickOptionFlags } from '../pickOptionFlags.js';
import { pickPreamble } from '../pickPreamble.js';
import { pickProviderRatio } from '../pickProviderRatio.js';
import { pickRatio } from '../pickRatio.js';
import { pickRecencyFactor } from '../pickRecencyFactor.js';
import { pickStrength } from '../pickStrength.js';

describe('pickProviderRatio', () => {
  it('extracts value and enabled from a valid object', () => {
    expect(
      pickProviderRatio({ value: 70, enabled: true }, DEFAULT_CONFIG.ratio.codex),
    ).toEqual({ value: 70, enabled: true });
  });

  it('returns fallback when input is not an object', () => {
    expect(pickProviderRatio(null, DEFAULT_CONFIG.ratio.codex)).toEqual(
      DEFAULT_CONFIG.ratio.codex,
    );
  });

  it('clamps value exceeding 100 to 100', () => {
    const fallback = { value: 50, enabled: true };
    expect(pickProviderRatio({ value: 150, enabled: false }, fallback)).toEqual(
      { value: 100, enabled: false },
    );
  });
});

describe('pickRatio', () => {
  it('extracts modern object-format ratio for all three providers', () => {
    const raw = {
      codex: { value: 40, enabled: true },
      antigravity: { value: 30, enabled: false },
      claude: { value: 60, enabled: true },
    };
    expect(pickRatio(raw)).toEqual(raw);
  });
});

describe('pickStrength', () => {
  it('returns a valid InterventionStrength value as-is', () => {
    expect(pickStrength(2)).toBe(2);
    expect(pickStrength(-2)).toBe(-2);
  });

  it('returns default when value is not a valid InterventionStrength', () => {
    expect(pickStrength(99)).toBe(DEFAULT_CONFIG.intervention_strength);
  });
});

describe('pickKeywords', () => {
  it('extracts all three keyword strings', () => {
    const raw = { codex: 'build', antigravity: 'find', claude: 'reason' };
    expect(pickKeywords(raw)).toEqual(raw);
  });

  it('returns default when input is not an object', () => {
    expect(pickKeywords(42)).toEqual(DEFAULT_CONFIG.keywords);
  });
});

describe('pickOptionFlags', () => {
  it('extracts valid flags for all three providers', () => {
    const raw = {
      codex: { yolo: true, sandbox: 'read-only' },
      antigravity: { sandbox: false, skip_permissions: true },
      claude: { permission_mode: 'plan' },
    };
    expect(pickOptionFlags(raw)).toEqual({
      codex: { yolo: true, sandbox: 'read-only' },
      antigravity: { sandbox: false, skip_permissions: true },
      claude: { permission_mode: 'plan' },
    });
  });

  it('falls back claude permission_mode to default for an unknown value', () => {
    const result = pickOptionFlags({ claude: { permission_mode: 'nope' } });
    expect(result.claude.permission_mode).toBe(
      DEFAULT_CONFIG.option_flags.claude.permission_mode,
    );
  });

  it('returns default when input is not an object', () => {
    expect(pickOptionFlags(null)).toEqual(DEFAULT_CONFIG.option_flags);
  });
});

describe('pickPreamble', () => {
  it('extracts preamble strings for all providers', () => {
    const raw = { codex: 'c-pre', antigravity: 'a-pre', claude: 'cl-pre' };
    expect(pickPreamble(raw)).toEqual(raw);
  });
});

describe('pickRecencyFactor', () => {
  it('extracts valid RecencyLevel values', () => {
    const raw = { codex: 'auto', antigravity: 'off', claude: 'strict' };
    expect(pickRecencyFactor(raw)).toEqual(raw);
  });

  it('falls back to defaults for invalid level values', () => {
    const raw = { codex: 123, antigravity: 'strict', claude: 'never' };
    expect(pickRecencyFactor(raw)).toEqual({
      codex: DEFAULT_CONFIG.recency_factor.codex,
      antigravity: 'strict',
      claude: DEFAULT_CONFIG.recency_factor.claude,
    });
  });
});
