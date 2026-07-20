import {
  createDefaultConfig,
  getRuleDocsStatus,
  loadConfig,
} from '../../../../core/infra/configLoader/configLoader.js';
import type { SettingsPageState } from '../types/settingsTypes.js';

/**
 * Assemble the state injected into the settings page: the current config
 * (or the 8-rule default when the project has none yet) plus the rule doc
 * deployment snapshot.
 */
export function buildSettingsState(projectRoot: string): SettingsPageState {
  const { config } = loadConfig(projectRoot);
  const status = getRuleDocsStatus(projectRoot);
  return {
    projectRoot,
    configExists: config !== null,
    config: config ?? createDefaultConfig(),
    ruleDocs: {
      entries: status.entries,
      autoDeployed: status.autoDeployed,
      pluginRootResolved: status.pluginRootResolved,
    },
  };
}
