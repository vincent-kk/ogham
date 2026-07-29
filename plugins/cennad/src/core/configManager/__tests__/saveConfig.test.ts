import { readFile, rm } from 'node:fs/promises';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG } from '../../../constants/defaults.js';
import { CENNAD_HOME, CONFIG_PATH } from '../../../constants/paths.js';
import type { Config } from '../../../types/index.js';
import { loadConfig } from '../operations/loadConfig.js';
import { saveConfig } from '../operations/saveConfig.js';

describe('saveConfig', () => {
  beforeEach(async () => {
    await rm(CENNAD_HOME, { recursive: true, force: true });
  });

  afterEach(async () => {
    await rm(CENNAD_HOME, { recursive: true, force: true });
  });

  it('writes config.json with the validated payload', async () => {
    const config: Config = {
      ...DEFAULT_CONFIG,
      ratio: {
        codex: { value: 25, enabled: true },
        antigravity: { value: 50, enabled: false },
        claude: { value: 75, enabled: true },
      },
    };
    await saveConfig('user', config);
    const written = JSON.parse(await readFile(CONFIG_PATH, 'utf8'));
    expect(written).toEqual(config);
  });

  it('roundtrips through loadConfig', async () => {
    const config: Config = {
      ...DEFAULT_CONFIG,
      session_ttl_hours: 12,
    };
    await saveConfig('user', config);
    expect(await loadConfig()).toEqual(config);
  });

  // The top effort level has to survive the save→load round trip, or picking it in
  // the settings UI silently reverts to whatever the merge falls back to.
  it('roundtrips a claude tier pinned to ultracode', async () => {
    const config: Config = {
      ...DEFAULT_CONFIG,
      model_map: {
        ...DEFAULT_CONFIG.model_map,
        claude: {
          ...DEFAULT_CONFIG.model_map.claude,
          apex: { model: 'opus[1m]', effort: 'ultracode' },
        },
      },
    };
    await saveConfig('user', config);
    expect((await loadConfig()).model_map.claude.apex).toEqual({
      model: 'opus[1m]',
      effort: 'ultracode',
    });
  });

  it('writes a partial document without validating it', async () => {
    // saveConfig is the persistence primitive and does not validate: a project
    // layer carries only the keys it overrides and cannot satisfy the strict
    // schema alone. The settings handler validates the merged preview and
    // refuses to call this when that fails.
    await saveConfig('user', { session_ttl_hours: 24 });

    expect(JSON.parse(await readFile(CONFIG_PATH, 'utf8'))).toEqual({
      session_ttl_hours: 24,
    });
  });
});
