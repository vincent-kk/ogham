import { readFile, rm } from 'node:fs/promises';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG } from '../../../constants/defaults.js';
import { COGAIR_HOME, CONFIG_PATH } from '../../../constants/paths.js';
import type { Config } from '../../../types/index.js';
import { loadConfig } from '../loadConfig.js';
import { saveConfig } from '../saveConfig.js';

describe('saveConfig', () => {
  beforeEach(async () => {
    await rm(COGAIR_HOME, { recursive: true, force: true });
  });

  afterEach(async () => {
    await rm(COGAIR_HOME, { recursive: true, force: true });
  });

  it('writes config.json with the validated payload', async () => {
    const config: Config = {
      ...DEFAULT_CONFIG,
      ratio: { gemini: 3, codex: 1 },
    };
    await saveConfig(config);
    const written = JSON.parse(await readFile(CONFIG_PATH, 'utf8'));
    expect(written).toEqual(config);
  });

  it('roundtrips through loadConfig', async () => {
    const config: Config = {
      ...DEFAULT_CONFIG,
      session_ttl_hours: 12,
      default_model: 'low',
    };
    await saveConfig(config);
    expect(await loadConfig()).toEqual(config);
  });

  it('rejects invalid input via the Zod schema', async () => {
    await expect(
      saveConfig({
        ...DEFAULT_CONFIG,
        session_ttl_hours: -1,
      } as Config),
    ).rejects.toThrow();
  });
});
