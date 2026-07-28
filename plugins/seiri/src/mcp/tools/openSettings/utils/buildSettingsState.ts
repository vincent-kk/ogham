import {
  createDefaultConfig,
  loadConfigScope,
  loadIntervention,
} from '../../../../core/infra/configLoader/index.js';
import {
  getRuleDocsChannel,
  getRuleDocsStatus,
} from '../../../../core/ruleDocs/index.js';
import type { SeiriConfigScope } from '../../../../types/config.js';
import type { SettingsPageState } from '../types/settingsTypes.js';

/**
 * Assemble the state the settings page renders from: both stored dial
 * layers, the dial they resolve to, and a filesystem snapshot of every
 * rule doc at the layer the page opens on.
 *
 * `config` is the effective dial rather than one layer's, so the page opens
 * showing what is actually in force. `scope` is what lets the toggle say
 * which layer said so.
 *
 * Checkboxes are pre-checked from `deployed`, not from stored preferences,
 * so deleting a rule file by hand is reflected the next time the page opens
 * instead of being silently re-applied.
 *
 * @param projectRoot Anchor for the project layer of both the dial and the
 *   rule channel.
 * @param pluginRoot Root the rule manifest and templates are read from.
 * @returns The state injected into the page as `__SEIRI_STATE__`.
 */
export function buildSettingsState(
  projectRoot: string,
  pluginRoot: string,
): SettingsPageState {
  const scope = loadConfigScope(projectRoot);
  const dial = loadIntervention(projectRoot);
  // `scripts/app.js` opens its toggle on the same reading of the same
  // snapshot; the page cannot import this, so the two restate one rule.
  const active: SeiriConfigScope =
    scope.layers.project === null ? 'user' : 'project';
  return {
    projectRoot,
    configExists: scope.layers.project !== null,
    config:
      dial.source === 'default'
        ? createDefaultConfig()
        : { intervention: dial.effective },
    scope,
    ruleDocs: {
      entries: getRuleDocsStatus(projectRoot, pluginRoot, active),
      pluginRootResolved: true,
      scope: active,
      displayTarget: getRuleDocsChannel(projectRoot, active),
    },
  };
}
