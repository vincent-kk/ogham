import { describe, expect, it } from 'vitest';

import { ConfigSchema } from '../../types/config.js';
import { DEFAULT_CONFIG, DIR_MODE, FILE_MODE } from '../defaults.js';

describe('DEFAULT_CONFIG', () => {
  it('is valid against ConfigSchema', () => {
    expect(() => ConfigSchema.parse(DEFAULT_CONFIG)).not.toThrow();
  });

  it('uses 50:50 enabled ratio and neutral strength', () => {
    expect(DEFAULT_CONFIG.ratio).toEqual({
      gemini: { value: 50, enabled: true },
      codex: { value: 50, enabled: true },
      antigravity: { value: 50, enabled: false },
    });
    expect(DEFAULT_CONFIG.intervention_strength).toBe(0);
  });

  it('defaults option_flags to safe per-provider sandbox', () => {
    expect(DEFAULT_CONFIG.option_flags).toEqual({
      gemini: { yolo: true, sandbox: true, sandbox_backend: 'auto' },
      codex: { yolo: false, sandbox: 'workspace-write' },
      antigravity: { sandbox: false, skip_permissions: false },
    });
  });

  it('defaults session TTL to 72 hours', () => {
    expect(DEFAULT_CONFIG.session_ttl_hours).toBe(72);
  });

  // app.js DEFAULT_DEFAULT_TIER mirrors this value — keep in sync.
  it('defaults default_tier to mid for every provider', () => {
    expect(DEFAULT_CONFIG.default_tier).toEqual({
      gemini: 'mid',
      codex: 'mid',
      antigravity: 'mid',
    });
  });
});

describe('file modes', () => {
  it('uses 0o700 for directories and 0o600 for files', () => {
    expect(DIR_MODE).toBe(0o700);
    expect(FILE_MODE).toBe(0o600);
  });
});
