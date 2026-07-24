import { createDefaultConfig } from '../../../../core/infra/configLoader/index.js';
import { loadConfig } from '../../../../core/infra/configLoader/index.js';
import { getRuleDocsStatus } from '../../../../core/ruleDocs/index.js';
import type { SettingsPageState } from '../types/settingsTypes.js';

/**
 * Assemble the state the settings page renders from: the current dial (or
 * the default when the project has none yet) plus a filesystem snapshot of
 * every rule doc.
 *
 * Checkboxes are pre-checked from `deployed`, not from stored preferences,
 * so deleting a rule file by hand is reflected the next time the page
 * opens instead of being silently re-applied.
 */
export function buildSettingsState(
  projectRoot: string,
  pluginRoot: string,
): SettingsPageState {
  const { config } = loadConfig(projectRoot);
  return {
    projectRoot,
    configExists: config !== null,
    config: config ?? createDefaultConfig(),
    ruleDocs: {
      entries: getRuleDocsStatus(projectRoot, pluginRoot),
      pluginRootResolved: true,
    },
  };
}
