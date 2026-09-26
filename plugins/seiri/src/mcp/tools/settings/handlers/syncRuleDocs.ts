import { pluginRoot, projectRoot } from '@ogham/cross-platform';

import {
  applyRuleDocs,
  getRuleDocsStatus,
  loadManifest,
  planRuleDocs,
} from '../../../../core/ruleDocs/index.js';
import type {
  SettingsInput,
  SettingsOutput,
} from '../types/settingsContract.js';

/**
 * Inspect or reconcile the active host's rule channel.
 *
 * The settings page is the interactive path; these actions are the headless
 * path for hosts without a browser and for scripted setup. Session hooks
 * must never call them — rule files change only by explicit user action.
 *
 * `plan` answers the same question as `sync` without writing, so a caller
 * that cannot render the settings page can still show the diff first.
 */
export function syncRuleDocs(input: SettingsInput): SettingsOutput {
  const root = projectRoot(input.project_root);
  const plugin = pluginRoot();
  if (plugin === null)
    throw new Error(
      'Cannot locate the seiri plugin directory, so the rule templates it ships are unreachable.',
    );

  if (input.action === 'manifest')
    return { action: 'manifest', manifest: loadManifest(plugin) };

  if (input.action === 'status')
    return { action: 'status', entries: getRuleDocsStatus(root, plugin) };

  const selections = input.selections;
  if (!selections || typeof selections !== 'object')
    throw new Error(`selections is required for action "${input.action}"`);

  const selected = Object.entries(selections)
    .filter(([, enabled]) => enabled)
    .map(([id]) => id);
  const options = {
    resync: input.resync ?? [],
    ...(Object.prototype.hasOwnProperty.call(input, 'revision')
      ? { revision: input.revision }
      : {}),
  };

  if (input.action === 'plan')
    return {
      action: 'plan',
      result: planRuleDocs(root, plugin, selected, options),
      selected,
    };

  return {
    action: 'sync',
    result: applyRuleDocs(root, plugin, selected, options),
    selected,
  };
}
