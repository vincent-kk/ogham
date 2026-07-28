import {
  createDefaultConfig,
  loadConfigScope,
  loadIntervention,
} from '../../../../core/infra/configLoader/index.js';
import { getRuleDocsStatus } from '../../../../core/ruleDocs/index.js';
import type { SettingsPageState } from '../types/settingsTypes.js';

/**
 * Assemble the state the settings page renders from: both stored dial
 * layers, the dial they resolve to, and a filesystem snapshot of every
 * rule doc.
 *
 * `config` is the effective dial rather than one layer's, so the page opens
 * showing what is actually in force. `scope` is what lets the toggle say
 * which layer said so.
 *
 * Checkboxes are pre-checked from `deployed`, not from stored preferences,
 * so deleting a rule file by hand is reflected the next time the page opens
 * instead of being silently re-applied.
 */
export function buildSettingsState(
  projectRoot: string,
  pluginRoot: string,
): SettingsPageState {
  const scope = loadConfigScope(projectRoot);
  const dial = loadIntervention(projectRoot);
  return {
    projectRoot,
    configExists: scope.layers.project !== null,
    config:
      dial.source === 'default'
        ? createDefaultConfig()
        : { intervention: dial.effective },
    scope,
    ruleDocs: {
      entries: getRuleDocsStatus(projectRoot, pluginRoot),
      pluginRootResolved: true,
    },
  };
}
