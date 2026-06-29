import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { pluginCache } from '@ogham/cross-platform/paths';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_CONFIG } from '../../../constants/defaults.js';
import { CENNAD_HOME, CONFIG_PATH } from '../../../constants/paths.js';
import { loadConfig } from '../operations/loadConfig.js';

const ORIGINAL_CENNAD_CONFIG_PATH = process.env.CENNAD_CONFIG_PATH;
const ORIGINAL_CLAUDE_PLUGIN_DATA = process.env.CLAUDE_PLUGIN_DATA;
const ORIGINAL_CLAUDE_PLUGIN_DADA = process.env.CLAUDE_PLUGIN_DADA;

async function writeConfigFile(content: string): Promise<void> {
  await mkdir(dirname(CONFIG_PATH), { recursive: true });
  await writeFile(CONFIG_PATH, content);
}

async function writeConfigAt(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
}

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

async function loadConfigForHome(home: string): Promise<{
  loadConfig: typeof import('../operations/loadConfig.js').loadConfig;
  CONFIG_PATH: string;
}> {
  process.env.CENNAD_CONFIG_PATH = home;
  vi.resetModules();
  const [{ loadConfig }, { CONFIG_PATH }] = await Promise.all([
    import('../operations/loadConfig.js'),
    import('../../../constants/paths.js'),
  ]);
  return { loadConfig, CONFIG_PATH };
}

describe('loadConfig', () => {
  beforeEach(async () => {
    await rm(CENNAD_HOME, { recursive: true, force: true });
  });

  afterEach(async () => {
    restoreEnv('CENNAD_CONFIG_PATH', ORIGINAL_CENNAD_CONFIG_PATH);
    restoreEnv('CLAUDE_PLUGIN_DATA', ORIGINAL_CLAUDE_PLUGIN_DATA);
    restoreEnv('CLAUDE_PLUGIN_DADA', ORIGINAL_CLAUDE_PLUGIN_DADA);
    vi.resetModules();
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
        claude: { permission_mode: 'auto' as const },
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

  it('reads plugin cache config as fallback when active config is missing', async () => {
    const activeHome = await mkdtemp(join(tmpdir(), 'cennad-active-home-'));
    const active = await loadConfigForHome(activeHome);
    const fallbackConfig = {
      ratio: { codex: { value: 25, enabled: true } },
      keywords: { codex: 'from fallback' },
    };
    await writeConfigAt(
      join(pluginCache('cennad'), 'config.json'),
      JSON.stringify(fallbackConfig),
    );

    const result = await active.loadConfig();

    expect(result.ratio.codex).toEqual({ value: 25, enabled: true });
    expect(result.keywords.codex).toBe('from fallback');
    await expect(readFile(active.CONFIG_PATH, 'utf8')).rejects.toThrow();
    await rm(activeHome, { recursive: true, force: true });
  });

  it('reads plugin cache config as fallback when active config cannot be parsed', async () => {
    const activeHome = await mkdtemp(join(tmpdir(), 'cennad-active-home-'));
    const active = await loadConfigForHome(activeHome);
    await writeConfigAt(active.CONFIG_PATH, '{not valid json');
    await writeConfigAt(
      join(pluginCache('cennad'), 'config.json'),
      JSON.stringify({ keywords: { codex: 'parse fallback' } }),
    );

    const result = await active.loadConfig();

    expect(result.keywords.codex).toBe('parse fallback');
    await expect(readFile(active.CONFIG_PATH, 'utf8')).resolves.toBe(
      '{not valid json',
    );
    await rm(activeHome, { recursive: true, force: true });
  });

  it('does not use Claude plugin data env paths as fallback sources', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cennad-plugin-data-'));
    const activeHome = join(root, 'active');
    const pluginDataHome = join(root, 'official-data');
    const pluginDadaHome = join(root, 'official-dada');
    process.env.CLAUDE_PLUGIN_DATA = pluginDataHome;
    process.env.CLAUDE_PLUGIN_DADA = pluginDadaHome;
    const active = await loadConfigForHome(activeHome);
    await writeConfigAt(
      join(pluginDataHome, 'config.json'),
      JSON.stringify({ keywords: { codex: 'plugin data' } }),
    );
    await writeConfigAt(
      join(pluginDadaHome, 'config.json'),
      JSON.stringify({ keywords: { codex: 'plugin dada' } }),
    );

    await expect(active.loadConfig()).resolves.toEqual(DEFAULT_CONFIG);
    await rm(root, { recursive: true, force: true });
  });
});
