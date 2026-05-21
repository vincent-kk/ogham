import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG } from '../../../constants/defaults.js';
import { COGAIR_HOME, CONFIG_PATH } from '../../../constants/paths.js';
import { loadConfig } from '../loadConfig.js';

async function writeConfigFile(content: string): Promise<void> {
  await mkdir(dirname(CONFIG_PATH), { recursive: true });
  await writeFile(CONFIG_PATH, content);
}

describe('loadConfig', () => {
  beforeEach(async () => {
    await rm(COGAIR_HOME, { recursive: true, force: true });
  });

  afterEach(async () => {
    await rm(COGAIR_HOME, { recursive: true, force: true });
  });

  it('returns DEFAULT_CONFIG when config.json is missing', async () => {
    expect(await loadConfig()).toEqual(DEFAULT_CONFIG);
  });

  it('loads a fully-specified config from disk', async () => {
    const stored = {
      ratio: { gemini: 2, codex: 3 },
      intervention_strength: 1,
      keywords: { gemini: 'g', codex: 'c' },
      default_model: 'high',
      default_options: { multi_agent: true },
      session_ttl_hours: 24,
    };
    await writeConfigFile(JSON.stringify(stored));
    expect(await loadConfig()).toEqual(stored);
  });

  it('merges partial config with defaults', async () => {
    await writeConfigFile(JSON.stringify({ ratio: { gemini: 5, codex: 0 } }));
    const result = await loadConfig();
    expect(result.ratio).toEqual({ gemini: 5, codex: 0 });
    expect(result.keywords).toEqual(DEFAULT_CONFIG.keywords);
    expect(result.session_ttl_hours).toBe(DEFAULT_CONFIG.session_ttl_hours);
  });

  it('falls back to defaults on JSON syntax error', async () => {
    await writeConfigFile('{not valid json');
    expect(await loadConfig()).toEqual(DEFAULT_CONFIG);
  });

  it('falls back to defaults when schema validation fails', async () => {
    await writeConfigFile(
      JSON.stringify({ ratio: { gemini: 'not-a-number', codex: 1 } }),
    );
    expect(await loadConfig()).toEqual(DEFAULT_CONFIG);
  });

  it('falls back to defaults when top-level value is not an object', async () => {
    await writeConfigFile('"hello"');
    expect(await loadConfig()).toEqual(DEFAULT_CONFIG);
  });
});
