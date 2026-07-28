import { basename } from 'node:path';

import {
  loadConfigByScope,
  loadConfigScope,
} from '../../../../core/configManager/configManager.js';
import type {
  SettingsBootstrap,
  SettingsPageState,
} from '../../../../types/settings.js';

/**
 * Assemble the state injected into the settings page: the config in effect
 * across both layers, which layer said what, plus the session-supplied
 * bootstrap facts and a local-provider key suggestion.
 */
export async function buildSettingsState(
  projectRoot: string,
  bootstrap: SettingsBootstrap,
): Promise<SettingsPageState> {
  const configByScope = await loadConfigByScope(projectRoot);
  const scope = loadConfigScope(projectRoot);
  const suggested = basename(projectRoot)
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase();
  return {
    projectRoot,
    // The project layer's presence, not the file's — a workspace with only a
    // user layer has a usable config but nothing committed here yet.
    configExists: scope.layers.project !== null,
    scope,
    configByScope,
    suggestedLocalKey: suggested.length > 0 ? suggested : 'LOCAL',
    bootstrap,
  };
}
