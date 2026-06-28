import { describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG } from '../../../../constants/defaults.js';
import { normalizeRatio } from '../normalizeRatio.js';

describe('normalizeRatio', () => {
  it('returns a fully-normalized {value,enabled} input merged onto defaults', () => {
    const input = {
      codex: { value: 60, enabled: true },
      antigravity: { value: 40, enabled: false },
      claude: { value: 50, enabled: true },
    };
    expect(normalizeRatio(input)).toEqual(input);
  });

  it('migrates legacy integers, moving the gemini weight onto antigravity', () => {
    expect(normalizeRatio({ gemini: 3, codex: 2 })).toEqual({
      codex: { value: 40, enabled: true },
      antigravity: { value: 60, enabled: true },
      claude: { ...DEFAULT_CONFIG.ratio.claude },
    });
  });

  it('migrates legacy object-form gemini ratio onto antigravity', () => {
    expect(
      normalizeRatio({
        gemini: { value: 70, enabled: false },
        codex: { value: 30, enabled: true },
      }),
    ).toEqual({
      codex: { value: 30, enabled: true },
      antigravity: { value: 70, enabled: false },
      claude: { ...DEFAULT_CONFIG.ratio.claude },
    });
  });

  it('returns DEFAULT_CONFIG.ratio for null input', () => {
    expect(normalizeRatio(null)).toEqual(DEFAULT_CONFIG.ratio);
  });

  it('migrates legacy integers with the codex slot disabled', () => {
    expect(normalizeRatio({ gemini: 5, codex: 0 })).toEqual({
      codex: { value: 0, enabled: false },
      antigravity: { value: 100, enabled: true },
      claude: { ...DEFAULT_CONFIG.ratio.claude },
    });
  });

  it('disables the antigravity slot when the legacy gemini weight is zero', () => {
    expect(normalizeRatio({ gemini: 0, codex: 4 })).toEqual({
      codex: { value: 100, enabled: true },
      antigravity: { value: 0, enabled: false },
      claude: { ...DEFAULT_CONFIG.ratio.claude },
    });
  });

  it('falls back to DEFAULT_CONFIG.ratio when legacy integer sum is zero', () => {
    expect(normalizeRatio({ gemini: 0, codex: 0 })).toEqual(
      DEFAULT_CONFIG.ratio,
    );
  });

  it('returns DEFAULT_CONFIG.ratio for a string input', () => {
    expect(normalizeRatio('bad')).toEqual(DEFAULT_CONFIG.ratio);
  });

  it('returns DEFAULT_CONFIG.ratio for an array input', () => {
    expect(normalizeRatio([1, 2, 3])).toEqual(DEFAULT_CONFIG.ratio);
  });

  it('defaults the claude slot when absent from normalized-object input', () => {
    const result = normalizeRatio({
      codex: { value: 70, enabled: true },
      antigravity: { value: 30, enabled: true },
    }) as { claude: unknown };
    expect(result.claude).toEqual(DEFAULT_CONFIG.ratio.claude);
  });

  it('preserves a provided claude slot in normalized-object input', () => {
    const result = normalizeRatio({
      codex: { value: 50, enabled: true },
      antigravity: { value: 50, enabled: true },
      claude: { value: 80, enabled: false },
    }) as { claude: unknown };
    expect(result.claude).toEqual({ value: 80, enabled: false });
  });

  it('floors and clamps negative legacy integers to zero before summing', () => {
    // gemini:-3 → 0, codex:5 → 5; antigravity 0 (disabled), codex 100
    expect(normalizeRatio({ gemini: -3, codex: 5 })).toEqual({
      codex: { value: 100, enabled: true },
      antigravity: { value: 0, enabled: false },
      claude: { ...DEFAULT_CONFIG.ratio.claude },
    });
  });

  it('merges a partial {value} slot onto defaults for normalized-object input', () => {
    const result = normalizeRatio({
      codex: { value: 30, enabled: false },
      antigravity: { value: 70 },
    }) as { antigravity: { value: number; enabled: boolean } };
    expect(result.antigravity).toEqual({
      ...DEFAULT_CONFIG.ratio.antigravity,
      value: 70,
    });
  });
});
