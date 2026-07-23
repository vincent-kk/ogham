import { describe, expect, it } from 'vitest';

import { ConfigSchema } from '../../types/config.js';
import { DEFAULT_CONFIG, DIR_MODE, FILE_MODE } from '../defaults.js';

describe('DEFAULT_CONFIG', () => {
  it('is valid against ConfigSchema', () => {
    expect(() => ConfigSchema.parse(DEFAULT_CONFIG)).not.toThrow();
  });

  it('uses an all-enabled equal ratio and neutral strength', () => {
    expect(DEFAULT_CONFIG.ratio).toEqual({
      codex: { value: 34, enabled: true },
      antigravity: { value: 33, enabled: true },
      claude: { value: 33, enabled: true },
    });
    expect(DEFAULT_CONFIG.intervention_strength).toBe(0);
  });

  // antigravity sandbox + skip_permissions both default true (paired): agy headless
  // -p auto-denies permission-gated tools, so skip_permissions is needed; sandbox
  // keeps auto-approval inside terminal restrictions instead of an unbounded bypass.
  // app.js DEFAULT_OPTION_FLAGS mirrors this value — keep in sync.
  it('defaults option_flags to per-provider values', () => {
    expect(DEFAULT_CONFIG.option_flags).toEqual({
      codex: { yolo: false, sandbox: 'workspace-write' },
      antigravity: { sandbox: true, skip_permissions: true },
      claude: { permission_mode: 'dontAsk' },
    });
  });

  it('defaults session TTL to 72 hours', () => {
    expect(DEFAULT_CONFIG.session_ttl_hours).toBe(72);
  });

  // app.js DEFAULT_DEFAULT_TIER mirrors this value — keep in sync.
  it('defaults default_tier to mid for every provider', () => {
    expect(DEFAULT_CONFIG.default_tier).toEqual({
      codex: 'mid',
      antigravity: 'mid',
      claude: 'mid',
    });
  });

  it('defaults model_map.claude to per-tier {model, effort}', () => {
    expect(DEFAULT_CONFIG.model_map.claude).toEqual({
      high: { model: 'opus', effort: 'max' },
      mid: { model: 'opus', effort: 'high' },
      low: { model: 'sonnet', effort: 'high' },
    });
  });

  // Tiers ride codex's 5.6 split — sol (frontier) for high, terra (balanced) for
  // mid/low at different efforts.
  // app.js DEFAULT_CODEX_MODEL_MAP mirrors this value — keep in sync.
  it('defaults model_map.codex to per-tier {model, effort}', () => {
    expect(DEFAULT_CONFIG.model_map.codex).toEqual({
      high: { model: 'gpt-5.6-sol', effort: 'max' },
      mid: { model: 'gpt-5.6-terra', effort: 'high' },
      low: { model: 'gpt-5.6-terra', effort: 'medium' },
    });
  });

  // agy embeds the variant in the model name; dispatch recomposes {model, effort}
  // into "model (effort)".
  it('defaults model_map.antigravity to per-tier {model, effort}', () => {
    expect(DEFAULT_CONFIG.model_map.antigravity).toEqual({
      high: { model: 'Gemini 3.1 Pro', effort: 'High' },
      mid: { model: 'Gemini 3.5 Flash', effort: 'Medium' },
      low: { model: 'Gemini 3.5 Flash', effort: 'Low' },
    });
  });
});

describe('file modes', () => {
  it('uses 0o700 for directories and 0o600 for files', () => {
    expect(DIR_MODE).toBe(0o700);
    expect(FILE_MODE).toBe(0o600);
  });
});
