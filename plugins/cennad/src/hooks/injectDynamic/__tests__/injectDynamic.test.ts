import { describe, expect, it } from 'vitest';

import type { HookConfig, HookCounter } from '../../shared/configTypes.js';
import { buildDynamicPayload } from '../injectDynamic.js';
import { asNonNegInt } from '../utils/asNonNegInt.js';
import { type RatioLane, formatRatio } from '../utils/formatRatio.js';
import { signed } from '../utils/signed.js';

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

describe('formatRatio', () => {
  const lanes = (
    codex: [number, number],
    antigravity: [number, number],
    claude: [number, number],
  ): RatioLane[] => [
    { name: 'codex', count: codex[0], weight: codex[1] },
    { name: 'antigravity', count: antigravity[0], weight: antigravity[1] },
    { name: 'claude', count: claude[0], weight: claude[1] },
  ];

  it('returns 0% for every lane when total count is zero', () => {
    const r = formatRatio(lanes([0, 30], [0, 70], [0, 0]));
    expect(r.current).toBe('codex 0% · antigravity 0% · claude 0%');
  });

  it('computes rounded percentages from lane counts', () => {
    // codex=2, antigravity=1, claude=0, total=3 → 67% / 33% / 0%
    const r = formatRatio(lanes([2, 0], [1, 0], [0, 0]));
    expect(r.current).toBe('codex 67% · antigravity 33% · claude 0%');
  });

  it('renders each lane configured weight as the target line', () => {
    // raw weights 60 / 40 / 0 are shown verbatim
    const r = formatRatio(lanes([1, 60], [1, 40], [0, 0]));
    expect(r.target).toBe('codex 60% · antigravity 40% · claude 0%');
  });

  it('formats drift as signed difference (target - current)', () => {
    // counts 3/1/0 → current 75/25/0; weights 60/40/0 → target 60/40/0
    const r = formatRatio(lanes([3, 60], [1, 40], [0, 0]));
    expect(r.drift).toBe('codex -15 · antigravity +15 · claude 0');
  });
});

const BASE_CONFIG: HookConfig = {
  ratio: {
    codex: { value: 30, enabled: true },
    antigravity: { value: 70, enabled: true },
    claude: { value: 50, enabled: false },
  },
  intervention_strength: 0,
  keywords: { codex: 'code', antigravity: 'agy', claude: 'reason' },
  option_flags: {
    codex: { yolo: false, sandbox: 'read-only' },
    antigravity: { sandbox: false, skip_permissions: false },
    claude: { permission_mode: 'acceptEdits' },
  },
  preamble: { codex: '', antigravity: '', claude: '' },
  recency_factor: { codex: 'off', antigravity: 'off', claude: 'off' },
};

const ZERO_COUNTER: HookCounter = {
  codex: 0,
  antigravity: 0,
  claude: 0,
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

  it('appends "Available providers: none" when every provider is disabled', () => {
    const config: HookConfig = {
      ...BASE_CONFIG,
      ratio: {
        codex: { value: 0, enabled: false },
        antigravity: { value: 0, enabled: false },
        claude: { value: 0, enabled: false },
      },
    };
    const out = buildDynamicPayload(config, ZERO_COUNTER);
    expect(out).toContain('Available providers: none — run /setup');
  });
});
