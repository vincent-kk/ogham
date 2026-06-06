import { describe, expect, it } from 'vitest';

import type { HookConfig, HookCounter } from '../../shared/configTypes.js';
import { buildDynamicPayload } from '../injectDynamic.js';
import { asNonNegInt } from '../utils/asNonNegInt.js';
import { formatRatio } from '../utils/formatRatio.js';
import { signed } from '../utils/signed.js';

// --- asNonNegInt ---

describe('asNonNegInt', () => {
  it('returns the integer as-is for a valid non-negative integer', () => {
    expect(asNonNegInt(5)).toBe(5);
  });

  it('clamps negative numbers to 0', () => {
    expect(asNonNegInt(-3)).toBe(0);
  });

  it('floors positive floats', () => {
    expect(asNonNegInt(2.9)).toBe(2);
  });

  it('returns 0 for non-number input', () => {
    expect(asNonNegInt('42')).toBe(0);
  });

  it('returns 0 for non-finite values (Infinity)', () => {
    expect(asNonNegInt(Infinity)).toBe(0);
  });
});

// --- signed ---

describe('signed', () => {
  it('prefixes positive numbers with +', () => {
    expect(signed(5)).toBe('+5');
  });

  it('returns the string form of negative numbers without extra prefix', () => {
    expect(signed(-3)).toBe('-3');
  });

  it('returns "0" for zero', () => {
    expect(signed(0)).toBe('0');
  });
});

// --- formatRatio ---

describe('formatRatio', () => {
  it('returns 0% for both providers when total is zero', () => {
    const r = formatRatio(
      { google: 0, codex: 0 },
      { google: 70, codex: 30 },
      'gemini',
    );
    expect(r.current).toBe('gemini 0% · codex 0%');
  });

  it('computes rounded percentages from provider counts', () => {
    const r = formatRatio(
      { google: 1, codex: 2 },
      { google: 70, codex: 30 },
      'antigravity',
    );
    // google=1, codex=2, total=3 → google%=Math.round(1/3*100)=33, codex%=100-33=67
    expect(r.current).toBe('antigravity 33% · codex 67%');
  });

  it('formats the target ratio line from config values', () => {
    const r = formatRatio(
      { google: 1, codex: 1 },
      { google: 60, codex: 40 },
      'gemini',
    );
    expect(r.target).toBe('gemini 60% · codex 40%');
  });

  it('formats drift as signed difference (target - current)', () => {
    const r = formatRatio(
      { google: 3, codex: 1 },
      { google: 60, codex: 40 },
      'gemini',
    );
    // google%=Math.round(3/4*100)=75, codex%=25; drift gemini=60-75=-15, codex=40-25=+15
    expect(r.drift).toBe('gemini -15 · codex +15');
  });
});

// --- buildDynamicPayload ---

const BASE_CONFIG: HookConfig = {
  ratio: {
    gemini: { value: 70, enabled: false },
    codex: { value: 30, enabled: true },
    antigravity: { value: 70, enabled: true },
  },
  intervention_strength: 0,
  keywords: { gemini: 'gemini', codex: 'codex', antigravity: 'agy' },
  default_model: 'auto',
  option_flags: {
    gemini: { yolo: false, sandbox: false, sandbox_backend: 'auto' },
    codex: { yolo: false, sandbox: 'read-only' },
    antigravity: { sandbox: false, skip_permissions: false },
  },
  preamble: { gemini: '', codex: '', antigravity: '' },
  recency_factor: { gemini: 'off', codex: 'off', antigravity: 'off' },
};

const ZERO_COUNTER: HookCounter = {
  gemini: 0,
  codex: 0,
  antigravity: 0,
  is_stale: false,
};

describe('buildDynamicPayload', () => {
  it('shows "No calls this session yet." when total is zero', () => {
    const out = buildDynamicPayload(BASE_CONFIG, ZERO_COUNTER);
    expect(out).toContain('No calls this session yet.');
  });

  it('shows call counts and ratio lines when calls exist', () => {
    const counter: HookCounter = { ...ZERO_COUNTER, antigravity: 2, codex: 2 };
    const out = buildDynamicPayload(BASE_CONFIG, counter);
    expect(out).toContain('Calls this session:');
    expect(out).toContain('Current ratio:');
    expect(out).toContain('Target ratio:');
    expect(out).toContain('Drift:');
  });

  it('appends "Available providers: none" when no google engine and codex is disabled', () => {
    const config: HookConfig = {
      ...BASE_CONFIG,
      ratio: {
        gemini: { value: 0, enabled: false },
        codex: { value: 0, enabled: false },
        antigravity: { value: 0, enabled: false },
      },
    };
    const out = buildDynamicPayload(config, ZERO_COUNTER);
    expect(out).toContain('Available providers: none — run /setup');
  });
});
