import { getDefaultAdapterIds } from '../../../../adapters/index.js';
import {
  createDefaultConfig,
  getRuleDocsChannel,
  getRuleDocsStatus,
  loadConfig,
  loadConfigScope,
} from '../../../../core/infra/configLoader/index.js';
import type { SettingsPageState } from '../types/settingsTypes.js';

/**
 * Assemble the state injected into the settings page: the current config
 * (or the 8-rule default when the project has none yet) plus the rule doc
 * deployment snapshot for both config layers.
 *
 * Both layers are inspected because the scope toggle decides where rules
 * deploy, and the page never returns to the server between opening and
 * saving — a single snapshot would leave the toggle naming a channel it is
 * not describing. The second filesystem pass is the price of that.
 */
export function buildSettingsState(projectRoot: string): SettingsPageState {
  const loaded = loadConfig(projectRoot);
  const config = loaded.config ?? createDefaultConfig();
  const structureAdapterId =
    config.adapters.enabled[0] ?? getDefaultAdapterIds()[0];
  if (!structureAdapterId)
    throw new Error('at least one structure adapter must be registered');
  const user = getRuleDocsStatus(projectRoot, undefined, 'user');
  const project = getRuleDocsStatus(projectRoot, undefined, 'project');
  const scope = loadConfigScope(projectRoot);
  return {
    projectRoot,
    configExists: scope.layers.project !== null,
    config,
    configDiagnostics: loaded.diagnostics,
    scope,
    structureAdapterId,
    ruleDocs: {
      layers: {
        user: {
          entries: user.entries,
          autoDeployed: user.autoDeployed,
          displayTarget: getRuleDocsChannel(projectRoot, 'user'),
        },
        project: {
          entries: project.entries,
          autoDeployed: project.autoDeployed,
          displayTarget: getRuleDocsChannel(projectRoot, 'project'),
        },
      },
      // The plugin root is the same question in either layer; a layer that
      // could not resolve it reports no entries, which is the same answer.
      pluginRootResolved: project.pluginRootResolved,
    },
  };
}
