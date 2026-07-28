import { getDefaultAdapterIds } from '../../../../adapters/index.js';
import {
  createDefaultConfig,
  getRuleDocsStatus,
  loadConfig,
} from '../../../../core/infra/configLoader/index.js';
import type { SettingsPageState } from '../types/settingsTypes.js';

/**
 * Assemble the state injected into the settings page: the current config
 * (or the 8-rule default when the project has none yet) plus the rule doc
 * deployment snapshot.
 */
export function buildSettingsState(projectRoot: string): SettingsPageState {
  const loaded = loadConfig(projectRoot);
  const config = loaded.config ?? createDefaultConfig();
  const structureAdapterId =
    config.adapters.enabled[0] ?? getDefaultAdapterIds()[0];
  if (!structureAdapterId)
    throw new Error('at least one structure adapter must be registered');
  const status = getRuleDocsStatus(projectRoot);
  return {
    projectRoot,
    configExists: loaded.config !== null,
    config,
    configDiagnostics: loaded.diagnostics,
    structureAdapterId,
    ruleDocs: {
      entries: status.entries,
      autoDeployed: status.autoDeployed,
      pluginRootResolved: status.pluginRootResolved,
    },
  };
}
