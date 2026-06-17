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
        gemini: { value: 40, enabled: true },
        codex: { value: 60, enabled: true },
        antigravity: { value: 50, enabled: false },
      },
      intervention_strength: 1,
      keywords: { gemini: 'g', codex: 'c', antigravity: 'a' },
      option_flags: {
        gemini: { yolo: true, sandbox: true, sandbox_backend: 'docker' },
        codex: { yolo: false, sandbox: 'workspace-write' },
        antigravity: { sandbox: true, skip_permissions: false },
      },
      model_map: {
        antigravity: {
          high: 'Gemini 3.1 Pro',
          mid: 'Claude Sonnet 4.5',
          low: 'Gemini 3.5 Flash',
        },
      },
      session_ttl_hours: 24,
      spawn_timeout_ms: 120_000,
      artifacts: { enabled: true, location: 'user' as const },
      preamble: { gemini: 'be terse', codex: 'prefer ts', antigravity: 'agy' },
      recency_factor: {
        gemini: 'auto' as const,
        codex: 'strict' as const,
        antigravity: 'auto' as const,
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

  it('injects artifacts defaults for legacy configs missing the block', async () => {
    const stored = {
      ratio: {
        gemini: { value: 50, enabled: true },
        codex: { value: 50, enabled: true },
      },
      intervention_strength: 0,
      keywords: { gemini: 'g', codex: 'c' },
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
      ratio: {
        gemini: { value: 50, enabled: true },
        codex: { value: 50, enabled: true },
      },
      intervention_strength: 0,
      keywords: { gemini: 'g', codex: 'c' },
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
      ratio: {
        gemini: { value: 50, enabled: true },
        codex: { value: 50, enabled: true },
      },
      intervention_strength: 0,
      keywords: { gemini: 'g', codex: 'c' },
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
      ratio: {
        gemini: { value: 50, enabled: true },
        codex: { value: 50, enabled: true },
      },
      intervention_strength: 0,
      keywords: DEFAULT_CONFIG.keywords,
      option_flags: DEFAULT_CONFIG.option_flags,
      session_ttl_hours: 72,
      recency_factor: { gemini: 'aggressive', codex: 'strict' },
    };
    await writeConfigFile(JSON.stringify(stored));
    const result = await loadConfig();
    expect(result.recency_factor.gemini).toBe(
      DEFAULT_CONFIG.recency_factor.gemini,
    );
    expect(result.recency_factor.codex).toBe('strict');
  });

  it('drops legacy default_options and injects option_flags defaults', async () => {
    const stored = {
      ratio: {
        gemini: { value: 50, enabled: true },
        codex: { value: 50, enabled: true },
      },
      intervention_strength: 0,
      keywords: { gemini: 'g', codex: 'c' },
      default_options: { multi_agent: true },
      session_ttl_hours: 72,
    };
    await writeConfigFile(JSON.stringify(stored));
    const result = await loadConfig();
    expect(result.option_flags).toEqual(DEFAULT_CONFIG.option_flags);
    expect(
      (result as unknown as Record<string, unknown>).default_options,
    ).toBeUndefined();
  });

  it('fills missing option_flags fields with defaults', async () => {
    const stored = {
      ratio: {
        gemini: { value: 50, enabled: true },
        codex: { value: 50, enabled: true },
      },
      intervention_strength: 0,
      keywords: { gemini: 'g', codex: 'c' },
      option_flags: { gemini: { yolo: true } },
      session_ttl_hours: 72,
    };
    await writeConfigFile(JSON.stringify(stored));
    const result = await loadConfig();
    expect(result.option_flags.gemini).toEqual({
      yolo: true,
      sandbox: DEFAULT_CONFIG.option_flags.gemini.sandbox,
      sandbox_backend: DEFAULT_CONFIG.option_flags.gemini.sandbox_backend,
    });
    expect(result.option_flags.codex).toEqual(
      DEFAULT_CONFIG.option_flags.codex,
    );
  });

  it('migrates legacy integer ratio with one provider disabled', async () => {
    await writeConfigFile(JSON.stringify({ ratio: { gemini: 5, codex: 0 } }));
    const result = await loadConfig();
    expect(result.ratio).toEqual({
      gemini: { value: 100, enabled: true },
      codex: { value: 0, enabled: false },
      antigravity: { value: 50, enabled: false },
    });
    expect(result.keywords).toEqual(DEFAULT_CONFIG.keywords);
    expect(result.session_ttl_hours).toBe(DEFAULT_CONFIG.session_ttl_hours);
  });

  it('migrates legacy integer ratio with both providers active', async () => {
    await writeConfigFile(JSON.stringify({ ratio: { gemini: 3, codex: 2 } }));
    const result = await loadConfig();
    expect(result.ratio).toEqual({
      gemini: { value: 60, enabled: true },
      codex: { value: 40, enabled: true },
      antigravity: { value: 50, enabled: false },
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

  it('falls back to defaults when schema validation fails', async () => {
    await writeConfigFile(
      JSON.stringify({
        ratio: {
          gemini: { value: 'not-a-number', enabled: true },
          codex: { value: 50, enabled: true },
        },
      }),
    );
    expect(await loadConfig()).toEqual(DEFAULT_CONFIG);
  });

  it('falls back to defaults when top-level value is not an object', async () => {
    await writeConfigFile('"hello"');
    expect(await loadConfig()).toEqual(DEFAULT_CONFIG);
  });
});
