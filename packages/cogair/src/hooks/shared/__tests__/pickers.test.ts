import { describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG } from '../../../constants/defaults.js';
import { pickKeywords } from '../pickKeywords.js';
import { pickModel } from '../pickModel.js';
import { pickOptionFlags } from '../pickOptionFlags.js';
import { pickPreamble } from '../pickPreamble.js';
import { pickProviderRatio } from '../pickProviderRatio.js';
import { pickRatio } from '../pickRatio.js';
import { pickRecencyFactor } from '../pickRecencyFactor.js';
import { pickStrength } from '../pickStrength.js';

describe('pickProviderRatio', () => {
  it('extracts value and enabled from a valid object', () => {
    expect(
      pickProviderRatio(
        { value: 70, enabled: true },
        DEFAULT_CONFIG.ratio.gemini,
      ),
    ).toEqual({
      value: 70,
      enabled: true,
    });
  });

  it('returns fallback when input is not an object', () => {
    expect(pickProviderRatio(null, DEFAULT_CONFIG.ratio.gemini)).toEqual(
      DEFAULT_CONFIG.ratio.gemini,
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
  it('extracts modern object-format ratio', () => {
    const raw = {
      gemini: { value: 60, enabled: true },
      codex: { value: 40, enabled: true },
      antigravity: { value: 30, enabled: false },
    };
    expect(pickRatio(raw)).toEqual({
      gemini: { value: 60, enabled: true },
      codex: { value: 40, enabled: true },
      antigravity: { value: 30, enabled: false },
    });
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
    const raw = { gemini: 'search', codex: 'build', antigravity: 'find' };
    expect(pickKeywords(raw)).toEqual({
      gemini: 'search',
      codex: 'build',
      antigravity: 'find',
    });
  });

  it('returns default when input is not an object', () => {
    expect(pickKeywords(42)).toEqual(DEFAULT_CONFIG.keywords);
  });
});

describe('pickModel', () => {
  it('returns a valid ModelAlias as-is', () => {
    expect(pickModel('high')).toBe('high');
    expect(pickModel('auto')).toBe('auto');
  });

  it('returns default_model for an unknown alias string', () => {
    expect(pickModel('ultra')).toBe(DEFAULT_CONFIG.default_model);
  });
});

describe('pickOptionFlags', () => {
  it('extracts valid flags for all three providers', () => {
    const raw = {
      gemini: { yolo: false, sandbox: true, sandbox_backend: 'docker' },
      codex: { yolo: true, sandbox: 'read-only' },
      antigravity: { sandbox: false, skip_permissions: true },
    };
    expect(pickOptionFlags(raw)).toEqual({
      gemini: { yolo: false, sandbox: true, sandbox_backend: 'docker' },
      codex: { yolo: true, sandbox: 'read-only' },
      antigravity: { sandbox: false, skip_permissions: true },
    });
  });

  it('returns default when input is not an object', () => {
    expect(pickOptionFlags(null)).toEqual(DEFAULT_CONFIG.option_flags);
  });
});

describe('pickPreamble', () => {
  it('extracts preamble strings for all providers', () => {
    const raw = { gemini: 'g-pre', codex: 'c-pre', antigravity: 'a-pre' };
    expect(pickPreamble(raw)).toEqual({
      gemini: 'g-pre',
      codex: 'c-pre',
      antigravity: 'a-pre',
    });
  });
});

describe('pickRecencyFactor', () => {
  it('extracts valid RecencyLevel values', () => {
    const raw = { gemini: 'strict', codex: 'auto', antigravity: 'off' };
    expect(pickRecencyFactor(raw)).toEqual({
      gemini: 'strict',
      codex: 'auto',
      antigravity: 'off',
    });
  });

  it('falls back to defaults for invalid level values', () => {
    const raw = { gemini: 'never', codex: 123, antigravity: 'strict' };
    expect(pickRecencyFactor(raw)).toEqual({
      gemini: DEFAULT_CONFIG.recency_factor.gemini,
      codex: DEFAULT_CONFIG.recency_factor.codex,
      antigravity: 'strict',
    });
  });
});
