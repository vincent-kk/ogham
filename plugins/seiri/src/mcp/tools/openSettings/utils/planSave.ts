import { planRuleDocs } from '../../../../core/ruleDocs/index.js';
import type { RuleDocSyncResult } from '../../../../types/manifest.js';
import type { SaveBody } from '../types/settingsTypes.js';

import { selectedIds } from './selectedIds.js';

/**
 * Dry-run a save body. Writes nothing; the dial is not touched either,
 * since a preview exists to answer "what lands in my repository", and the
 * dial only changes how much the session render says.
 */
export function planSave(
  projectRoot: string,
  pluginRoot: string,
  body: SaveBody,
): RuleDocSyncResult {
  return planRuleDocs(projectRoot, pluginRoot, selectedIds(body), {
    resync: body.ruleDocs.resync,
  });
}
