import {
  syncRuleDocs,
  writeConfig,
} from '../../../../../core/infra/configLoader/index.js';
import type { SaveBody, SaveSummary } from '../types/settingsTypes.js';

/**
 * Persist one settings-page save: write the named config layer, then
 * reconcile that same layer's rule target with the requested optional-rule
 * selection (required rules are enforced by `syncRuleDocs` itself).
 *
 * One layer choice governs both writes. Splitting them into two axes would
 * make the user answer the same question twice, and let the config and the
 * rules it describes drift into different layers.
 */
export function persistSave(projectRoot: string, body: SaveBody): SaveSummary {
  writeConfig(projectRoot, body.scope, body.config);

  const selection = Object.entries(body.ruleDocs.selections)
    .filter(([, selected]) => selected)
    .map(([id]) => id);
  const ruleDocs = syncRuleDocs(projectRoot, selection, {
    resync: body.ruleDocs.resync,
    scope: body.scope,
  });

  return { configWritten: true, ruleDocs };
}
