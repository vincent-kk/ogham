import { describe, expect, it } from 'vitest';

import { activeGoogleEngine } from '../activeGoogleEngine.js';
import type { HookConfig } from '../configTypes.js';

function makeConfig(
  antigravityEnabled: boolean,
  geminiEnabled: boolean,
): HookConfig {
  return {
    ratio: {
      antigravity: { value: 50, enabled: antigravityEnabled },
      gemini: { value: 50, enabled: geminiEnabled },
      codex: { value: 50, enabled: false },
    },
    intervention_strength: 0,
    keywords: { gemini: 'g', codex: 'c', antigravity: 'a' },
    default_model: 'auto',
    option_flags: {
      gemini: { yolo: false, sandbox: false, sandbox_backend: 'auto' },
      codex: { yolo: false, sandbox: 'read-only' },
      antigravity: { sandbox: false, skip_permissions: false },
    },
    preamble: { gemini: '', codex: '', antigravity: '' },
    recency_factor: { gemini: 'off', codex: 'off', antigravity: 'off' },
  };
}

describe('activeGoogleEngine', () => {
  it('returns antigravity when only antigravity is enabled', () => {
    expect(activeGoogleEngine(makeConfig(true, false))).toBe('antigravity');
  });

  it('returns gemini when only gemini is enabled', () => {
    expect(activeGoogleEngine(makeConfig(false, true))).toBe('gemini');
  });

  it('returns antigravity when both are enabled (antigravity wins)', () => {
    expect(activeGoogleEngine(makeConfig(true, true))).toBe('antigravity');
  });

  it('returns null when neither is enabled', () => {
    expect(activeGoogleEngine(makeConfig(false, false))).toBeNull();
  });
});
