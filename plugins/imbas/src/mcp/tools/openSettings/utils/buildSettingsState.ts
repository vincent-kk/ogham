import { existsSync } from 'node:fs';
import { basename, join } from 'node:path';

import {
  CONFIG_FILENAME,
  IMBAS_ROOT_DIRNAME,
} from '../../../../constants/index.js';
import { loadConfig } from '../../../../core/configManager/configManager.js';
import type {
  SettingsBootstrap,
  SettingsPageState,
} from '../../../../types/settings.js';

/**
 * Assemble the state injected into the settings page: the current config
 * (schema defaults when the project has none yet) plus the session-supplied
 * bootstrap facts and a local-provider key suggestion.
 */
export async function buildSettingsState(
  projectRoot: string,
  bootstrap: SettingsBootstrap,
): Promise<SettingsPageState> {
  const config = await loadConfig(projectRoot);
  const suggested = basename(projectRoot)
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase();
  return {
    projectRoot,
    configExists: existsSync(
      join(projectRoot, IMBAS_ROOT_DIRNAME, CONFIG_FILENAME),
    ),
    config,
    suggestedLocalKey: suggested.length > 0 ? suggested : 'LOCAL',
    bootstrap,
  };
}
