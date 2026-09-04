import { loadConfigScope } from '../../../../core/infra/configLoader/index.js';
import {
  getRuleDocsChannel,
  getRuleDocsStatus,
} from '../../../../core/ruleDocs/index.js';
import type { SeiriConfigScope } from '../../../../types/config.js';
import type {
  RuleDocLayerState,
  SettingsPageState,
} from '../types/settingsTypes.js';

/**
 * Assemble the state the settings page renders from: both stored dial
 * layers and a filesystem snapshot of every rule doc at each layer.
 *
 * The dial arrives per layer rather than pre-merged, because the toggle
 * seats the form on the layer it names — a single effective dial would show
 * the project's value under the User heading. It would also carry the
 * session valve, which is not an editable layer.
 *
 * Both layers are snapshotted, which costs a second pass over the rule
 * channel: the toggle decides where rules are deployed, so it has to redraw
 * the answer the moment it moves, and a page that had to ask the server first
 * would show the layer it just left in the meantime.
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
  // `scripts/app.js` opens its toggle on the same reading of the same
  // snapshot; the page cannot import this, so the two restate one rule.
  const active: SeiriConfigScope =
    scope.layers.project === null ? 'user' : 'project';
  return {
    projectRoot,
    configExists: scope.layers.project !== null,
    scope,
    ruleDocs: {
      pluginRootResolved: true,
      scope: active,
      layers: {
        user: ruleDocLayer(projectRoot, pluginRoot, 'user'),
        project: ruleDocLayer(projectRoot, pluginRoot, 'project'),
      },
    },
  };
}

function ruleDocLayer(
  projectRoot: string,
  pluginRoot: string,
  scope: SeiriConfigScope,
): RuleDocLayerState {
  return {
    entries: getRuleDocsStatus(projectRoot, pluginRoot, scope),
    displayTarget: getRuleDocsChannel(projectRoot, scope),
  };
}
