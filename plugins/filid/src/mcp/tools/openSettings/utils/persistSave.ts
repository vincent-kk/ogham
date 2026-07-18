import {
  syncRuleDocs,
  writeConfig,
} from '../../../../core/infra/configLoader/configLoader.js';
import type { SaveBody, SaveSummary } from '../types/settingsTypes.js';

/**
 * Persist one settings-page save: write `.filid/config.json`, then
 * reconcile `.claude/rules/` with the requested optional-rule selection
 * (required rules are enforced by `syncRuleDocs` itself).
 */
export function persistSave(projectRoot: string, body: SaveBody): SaveSummary {
  writeConfig(projectRoot, body.config);

  const selection = Object.entries(body.ruleDocs.selections)
    .filter(([, selected]) => selected)
    .map(([id]) => id);
  const ruleDocs = syncRuleDocs(projectRoot, selection, {
    resync: body.ruleDocs.resync,
  });

  return { configWritten: true, ruleDocs };
}
