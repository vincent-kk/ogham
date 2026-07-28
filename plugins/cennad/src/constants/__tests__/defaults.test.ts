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

  // apex is the "carry out the work" tier, so it takes the top of the scale:
  // `ultracode` runs the child as a multi-agent orchestrator. high keeps `max` —
  // the deepest single-agent setting — so the two tiers differ in kind, not degree.
  it('defaults model_map.claude to per-tier {model, effort}', () => {
    expect(DEFAULT_CONFIG.model_map.claude).toEqual({
      apex: { model: 'opus[1m]', effort: 'ultracode' },
      high: { model: 'opus', effort: 'max' },
      mid: { model: 'opus', effort: 'high' },
      low: { model: 'sonnet', effort: 'high' },
    });
  });

  // Tiers ride codex's 5.6 split — sol (frontier) for apex/high, terra (balanced)
  // for mid/low at different efforts. ultra is sol's delegating effort, the one
  // apex exists for.
  // app.js DEFAULT_CODEX_MODEL_MAP mirrors this value — keep in sync.
  it('defaults model_map.codex to per-tier {model, effort}', () => {
    expect(DEFAULT_CONFIG.model_map.codex).toEqual({
      apex: { model: 'gpt-5.6-sol', effort: 'ultra' },
      high: { model: 'gpt-5.6-sol', effort: 'max' },
      mid: { model: 'gpt-5.6-terra', effort: 'high' },
      low: { model: 'gpt-5.6-terra', effort: 'medium' },
    });
  });

  // agy embeds the variant in the model name; dispatch recomposes {model, effort}
  // into "model (effort)".
  it('defaults model_map.antigravity to per-tier {model, effort}', () => {
    expect(DEFAULT_CONFIG.model_map.antigravity).toEqual({
      apex: { model: 'Gemini 3.1 Pro', effort: 'High' },
      high: { model: 'Gemini 3.1 Pro', effort: 'Low' },
      mid: { model: 'Gemini 3.5 Flash', effort: 'Medium' },
      low: { model: 'Gemini 3.5 Flash', effort: 'Low' },
    });
  });

  // app.js DEFAULT_IDLE_TIMEOUT_MS / DEFAULT_HARD_CAP_MS mirror these — keep in sync.
  it('caps rise with the tier and stay above the shared idle limit', () => {
    const { idle_ms: idle, hard_cap_ms: caps } = DEFAULT_CONFIG.timeouts;
    expect(caps.apex).toBeGreaterThan(caps.high);
    expect(caps.high).toBeGreaterThan(caps.mid);
    expect(caps.mid).toBeGreaterThan(caps.low);
    expect(caps.low).toBeGreaterThan(idle);
  });
});

describe('file modes', () => {
  it('uses 0o700 for directories and 0o600 for files', () => {
    expect(DIR_MODE).toBe(0o700);
    expect(FILE_MODE).toBe(0o600);
  });
});
