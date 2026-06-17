import { describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG } from '../../../../constants/defaults.js';
import { normalizeRatio } from '../normalizeRatio.js';

describe('normalizeRatio', () => {
  it('returns DEFAULT_CONFIG.ratio for a fully-normalized {value,enabled} input', () => {
    const input = {
      gemini: { value: 40, enabled: true },
      codex: { value: 60, enabled: true },
      antigravity: { value: 50, enabled: false },
    };
    expect(normalizeRatio(input)).toEqual(input);
  });

  it('migrates legacy integers with both providers active to proportional percentages', () => {
    expect(normalizeRatio({ gemini: 3, codex: 2 })).toEqual({
      gemini: { value: 60, enabled: true },
      codex: { value: 40, enabled: true },
      antigravity: { ...DEFAULT_CONFIG.ratio.antigravity },
    });
  });

  it('migrates legacy integers with one provider disabled', () => {
    expect(normalizeRatio({ gemini: 5, codex: 0 })).toEqual({
      gemini: { value: 100, enabled: true },
      codex: { value: 0, enabled: false },
      antigravity: { ...DEFAULT_CONFIG.ratio.antigravity },
    });
  });

  it('falls back to DEFAULT_CONFIG.ratio when legacy integer sum is zero', () => {
    expect(normalizeRatio({ gemini: 0, codex: 0 })).toEqual(
      DEFAULT_CONFIG.ratio,
    );
  });

  it('returns DEFAULT_CONFIG.ratio for null input', () => {
    expect(normalizeRatio(null)).toEqual(DEFAULT_CONFIG.ratio);
  });

  it('returns DEFAULT_CONFIG.ratio for a string input', () => {
    expect(normalizeRatio('bad')).toEqual(DEFAULT_CONFIG.ratio);
  });

  it('returns DEFAULT_CONFIG.ratio for an array input', () => {
    expect(normalizeRatio([1, 2, 3])).toEqual(DEFAULT_CONFIG.ratio);
  });

  it('defaults antigravity slot when absent from normalized-object input', () => {
    const input = {
      gemini: { value: 70, enabled: true },
      codex: { value: 30, enabled: true },
    };
    const result = normalizeRatio(input) as { antigravity: unknown };
    expect(result.antigravity).toEqual(DEFAULT_CONFIG.ratio.antigravity);
  });

  it('preserves provided antigravity slot when present in normalized-object input', () => {
    const input = {
      gemini: { value: 50, enabled: true },
      codex: { value: 50, enabled: true },
      antigravity: { value: 80, enabled: true },
    };
    const result = normalizeRatio(input) as { antigravity: unknown };
    expect(result.antigravity).toEqual({ value: 80, enabled: true });
  });

  it('falls back provider slot to default when slot value is not a plain object', () => {
    const input = {
      gemini: 'invalid',
      codex: { value: 50, enabled: true },
    };
    const result = normalizeRatio(input) as { gemini: unknown };
    expect(result.gemini).toEqual(DEFAULT_CONFIG.ratio.gemini);
  });

  it('floors and clamps negative legacy integers to zero before summing', () => {
    // gemini:-3 → 0, codex:5 → 5; total=5, gPct=0, cPct=100
    expect(normalizeRatio({ gemini: -3, codex: 5 })).toEqual({
      gemini: { value: 0, enabled: false },
      codex: { value: 100, enabled: true },
      antigravity: { ...DEFAULT_CONFIG.ratio.antigravity },
    });
  });

  it('floors fractional legacy integers before computing percentages', () => {
    // gemini:1.9 → 1, codex:1.1 → 1; total=2, gPct=50, cPct=50
    expect(normalizeRatio({ gemini: 1.9, codex: 1.1 })).toEqual({
      gemini: { value: 50, enabled: true },
      codex: { value: 50, enabled: true },
      antigravity: { ...DEFAULT_CONFIG.ratio.antigravity },
    });
  });

  it('merges partial {value,enabled} slot onto defaults for normalized-object input', () => {
    const input = {
      gemini: { value: 70 },
      codex: { value: 30, enabled: false },
    };
    const result = normalizeRatio(input) as {
      gemini: { value: number; enabled: boolean };
      codex: { value: number; enabled: boolean };
    };
    expect(result.gemini).toEqual({
      ...DEFAULT_CONFIG.ratio.gemini,
      value: 70,
    });
    expect(result.codex).toEqual({ value: 30, enabled: false });
  });

  it('legacy migration codex=100: antigravity always uses DEFAULT_CONFIG default', () => {
    const result = normalizeRatio({ gemini: 0, codex: 4 }) as {
      antigravity: unknown;
    };
    expect(result.antigravity).toEqual(DEFAULT_CONFIG.ratio.antigravity);
  });
});
