import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { pluginCache } from '@ogham/cross-platform/paths';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_CONFIG } from '../../../constants/defaults.js';

const ORIGINAL_CENNAD_CONFIG_PATH = process.env.CENNAD_CONFIG_PATH;
const ORIGINAL_CLAUDE_PLUGIN_DATA = process.env.CLAUDE_PLUGIN_DATA;
const ORIGINAL_CLAUDE_PLUGIN_DADA = process.env.CLAUDE_PLUGIN_DADA;

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

async function writeConfigAt(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
}

async function loadHookConfigForHome(home: string): Promise<{
  loadConfig: typeof import('../loadConfig.js').loadConfig;
  CONFIG_PATH: string;
}> {
  process.env.CENNAD_CONFIG_PATH = home;
  vi.resetModules();
  const [{ loadConfig }, { CONFIG_PATH }] = await Promise.all([
    import('../loadConfig.js'),
    import('../paths.js'),
  ]);
  return { loadConfig, CONFIG_PATH };
}

describe('hook shared loadConfig', () => {
  beforeEach(async () => {
    await rm(pluginCache('cennad'), { recursive: true, force: true });
  });

  afterEach(async () => {
    restoreEnv('CENNAD_CONFIG_PATH', ORIGINAL_CENNAD_CONFIG_PATH);
    restoreEnv('CLAUDE_PLUGIN_DATA', ORIGINAL_CLAUDE_PLUGIN_DATA);
    restoreEnv('CLAUDE_PLUGIN_DADA', ORIGINAL_CLAUDE_PLUGIN_DADA);
    vi.resetModules();
    await rm(pluginCache('cennad'), { recursive: true, force: true });
  });

  it('reads plugin cache config as fallback without creating active config', async () => {
    const activeHome = await mkdtemp(join(tmpdir(), 'cennad-hook-active-'));
    const active = await loadHookConfigForHome(activeHome);
    await writeConfigAt(
      join(pluginCache('cennad'), 'config.json'),
      JSON.stringify({ keywords: { codex: 'hook fallback' } }),
    );

    const result = active.loadConfig();

    expect(result.keywords.codex).toBe('hook fallback');
    await expect(readFile(active.CONFIG_PATH, 'utf8')).rejects.toThrow();
    await rm(activeHome, { recursive: true, force: true });
  });

  it('does not use Claude plugin data env paths as fallback sources', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cennad-hook-plugin-data-'));
    const pluginDataHome = join(root, 'official-data');
    const pluginDadaHome = join(root, 'official-dada');
    process.env.CLAUDE_PLUGIN_DATA = pluginDataHome;
    process.env.CLAUDE_PLUGIN_DADA = pluginDadaHome;
    const active = await loadHookConfigForHome(join(root, 'active'));
    await writeConfigAt(
      join(pluginDataHome, 'config.json'),
      JSON.stringify({ keywords: { codex: 'plugin data' } }),
    );
    await writeConfigAt(
      join(pluginDadaHome, 'config.json'),
      JSON.stringify({ keywords: { codex: 'plugin dada' } }),
    );

    expect(active.loadConfig()).toEqual(DEFAULT_CONFIG);
    await rm(root, { recursive: true, force: true });
  });
});
