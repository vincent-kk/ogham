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

  it('defaults option_flags to safe per-provider values', () => {
    expect(DEFAULT_CONFIG.option_flags).toEqual({
      codex: { yolo: false, sandbox: 'workspace-write' },
      antigravity: { sandbox: false, skip_permissions: false },
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
});

describe('file modes', () => {
  it('uses 0o700 for directories and 0o600 for files', () => {
    expect(DIR_MODE).toBe(0o700);
    expect(FILE_MODE).toBe(0o600);
  });
});
