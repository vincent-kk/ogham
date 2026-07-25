import { writeConfig } from '../../../../core/infra/configLoader/index.js';
import { applyRuleDocs } from '../../../../core/ruleDocs/index.js';
import type { SaveBody, SaveSummary } from '../types/settingsTypes.js';

import { selectedIds } from './selectedIds.js';

/**
 * Persist one save: reconcile the active host's rule channel against the
 * preview revision, then write the dial only when reconciliation applied.
 *
 * This is one of only two places that write rule files — the other is the
 * `rule_docs_sync` tool used headlessly. Both are reached by an explicit
 * user action; nothing on a session path writes here.
 */
export function persistSave(
  projectRoot: string,
  pluginRoot: string,
  body: SaveBody,
): SaveSummary {
  const ruleDocs = applyRuleDocs(projectRoot, pluginRoot, selectedIds(body), {
    resync: body.ruleDocs.resync,
    revision: body.ruleDocs.revision ?? null,
  });
  if (!ruleDocs.applied)
    return {
      configWritten: false,
      ruleDocs,
    };

  writeConfig(projectRoot, body.config);
  return {
    configWritten: true,
    ruleDocs,
  };
}
