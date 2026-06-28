import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG } from '../../../constants/defaults.js';
import { CENNAD_HOME, CONFIG_PATH } from '../../../constants/paths.js';
import { loadConfig } from '../operations/loadConfig.js';

async function writeConfigFile(content: string): Promise<void> {
  await mkdir(dirname(CONFIG_PATH), { recursive: true });
  await writeFile(CONFIG_PATH, content);
}

describe('loadConfig', () => {
  beforeEach(async () => {
    await rm(CENNAD_HOME, { recursive: true, force: true });
  });

  afterEach(async () => {
    await rm(CENNAD_HOME, { recursive: true, force: true });
  });

  it('returns DEFAULT_CONFIG when config.json is missing', async () => {
    expect(await loadConfig()).toEqual(DEFAULT_CONFIG);
  });

  it('loads a fully-specified config from disk', async () => {
    const stored = {
      ratio: {
        codex: { value: 60, enabled: true },
        antigravity: { value: 50, enabled: false },
        claude: { value: 40, enabled: true },
      },
      intervention_strength: 1,
      keywords: { codex: 'c', antigravity: 'a', claude: 'cl' },
      option_flags: {
        codex: { yolo: false, sandbox: 'workspace-write' as const },
        antigravity: { sandbox: false, skip_permissions: false },
        claude: { permission_mode: 'plan' as const },
      },
      model_map: {
        antigravity: {
          high: 'Gemini 3.1 Pro',
          mid: 'Claude Sonnet 4.5',
          low: 'Gemini 3.5 Flash',
        },
        claude: {
          high: { model: 'opus', effort: 'max' as const },
          mid: { model: 'sonnet', effort: 'high' as const },
          low: { model: 'haiku' },
        },
      },
      default_tier: {
        codex: 'low' as const,
        antigravity: 'mid' as const,
        claude: 'high' as const,
      },
      session_ttl_hours: 24,
      spawn_timeout_ms: 120_000,
      artifacts: { enabled: true, location: 'user' as const },
      preamble: { codex: 'prefer ts', antigravity: 'agy', claude: 'be terse' },
      recency_factor: {
        codex: 'strict' as const,
        antigravity: 'auto' as const,
        claude: 'off' as const,
      },
      addons: {
        youtube: {
          enabled: true,
          language: 'ko' as const,
          targets: { codex: true, antigravity: false },
        },
      },
    };
    await writeConfigFile(JSON.stringify(stored));
    expect(await loadConfig()).toEqual(stored);
  });

  it('strips a leftover gemini section from a pre-upgrade config', async () => {
    const stored = {
      ratio: {
        gemini: { value: 40, enabled: true },
        codex: { value: 60, enabled: true },
        antigravity: { value: 50, enabled: false },
      },
      keywords: { gemini: 'g', codex: 'c', antigravity: 'a' },
    };
    await writeConfigFile(JSON.stringify(stored));
    const result = (await loadConfig()) as unknown as Record<string, unknown>;
    expect(result.ratio).not.toHaveProperty('gemini');
    expect(result.keywords).not.toHaveProperty('gemini');
    expect(result.ratio).toHaveProperty('claude');
  });

  it('injects artifacts and addons defaults for legacy configs missing the block', async () => {
    const stored = {
      ratio: { codex: { value: 50, enabled: true } },
      intervention_strength: 0,
      keywords: { codex: 'c' },
      option_flags: DEFAULT_CONFIG.option_flags,
      session_ttl_hours: 72,
    };
    await writeConfigFile(JSON.stringify(stored));
    const result = await loadConfig();
    expect(result.artifacts).toEqual(DEFAULT_CONFIG.artifacts);
    expect(result.addons).toEqual(DEFAULT_CONFIG.addons);
  });

  it('migrates legacy antigravity_youtube into the youtube addon', async () => {
    const stored = {
      ratio: { codex: { value: 50, enabled: true } },
      intervention_strength: 0,
      keywords: { codex: 'c' },
      option_flags: DEFAULT_CONFIG.option_flags,
      session_ttl_hours: 72,
      antigravity_youtube: { enabled: true },
    };
    await writeConfigFile(JSON.stringify(stored));
    const result = await loadConfig();
    expect(result.addons.youtube).toEqual({
      enabled: true,
      language: 'en',
      targets: { codex: false, antigravity: true },
    });
    expect(
      (result as unknown as Record<string, unknown>).antigravity_youtube,
    ).toBeUndefined();
  });

  it('injects preamble and recency_factor defaults for legacy configs', async () => {
    const stored = {
      ratio: { codex: { value: 50, enabled: true } },
      intervention_strength: 0,
      keywords: { codex: 'c' },
      option_flags: DEFAULT_CONFIG.option_flags,
      session_ttl_hours: 72,
    };
    await writeConfigFile(JSON.stringify(stored));
    const result = await loadConfig();
    expect(result.preamble).toEqual(DEFAULT_CONFIG.preamble);
    expect(result.recency_factor).toEqual(DEFAULT_CONFIG.recency_factor);
  });

  it('drops invalid recency level and falls back to default', async () => {
    const stored = {
      ratio: { codex: { value: 50, enabled: true } },
      intervention_strength: 0,
      keywords: DEFAULT_CONFIG.keywords,
      option_flags: DEFAULT_CONFIG.option_flags,
      session_ttl_hours: 72,
      recency_factor: { antigravity: 'aggressive', codex: 'strict' },
    };
    await writeConfigFile(JSON.stringify(stored));
    const result = await loadConfig();
    expect(result.recency_factor.antigravity).toBe(
      DEFAULT_CONFIG.recency_factor.antigravity,
    );
    expect(result.recency_factor.codex).toBe('strict');
  });

  it('fills missing option_flags fields with defaults', async () => {
    const stored = {
      ratio: { codex: { value: 50, enabled: true } },
      intervention_strength: 0,
      keywords: { codex: 'c' },
      option_flags: { codex: { yolo: true } },
      session_ttl_hours: 72,
    };
    await writeConfigFile(JSON.stringify(stored));
    const result = await loadConfig();
    expect(result.option_flags.codex).toEqual({
      yolo: true,
      sandbox: DEFAULT_CONFIG.option_flags.codex.sandbox,
    });
    expect(result.option_flags.claude).toEqual(
      DEFAULT_CONFIG.option_flags.claude,
    );
  });

  it('migrates a legacy integer ratio, moving the gemini weight onto antigravity', async () => {
    await writeConfigFile(JSON.stringify({ ratio: { gemini: 3, codex: 2 } }));
    const result = await loadConfig();
    expect(result.ratio).toEqual({
      codex: { value: 40, enabled: true },
      antigravity: { value: 60, enabled: true },
      claude: DEFAULT_CONFIG.ratio.claude,
    });
  });

  it('falls back to defaults when legacy ratio sums to zero', async () => {
    await writeConfigFile(JSON.stringify({ ratio: { gemini: 0, codex: 0 } }));
    const result = await loadConfig();
    expect(result.ratio).toEqual(DEFAULT_CONFIG.ratio);
  });

  it('falls back to defaults on JSON syntax error', async () => {
    await writeConfigFile('{not valid json');
    expect(await loadConfig()).toEqual(DEFAULT_CONFIG);
  });

  it('falls back to defaults when top-level value is not an object', async () => {
    await writeConfigFile('"hello"');
    expect(await loadConfig()).toEqual(DEFAULT_CONFIG);
  });
});
