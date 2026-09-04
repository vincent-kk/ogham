import { writeConfig } from '../../../../core/infra/configLoader/index.js';
import { applyRuleDocs } from '../../../../core/ruleDocs/index.js';
import type { SaveBody, SaveSummary } from '../types/settingsTypes.js';

import { selectedIds } from './selectedIds.js';

/**
 * Persist one save: reconcile the active host's rule channel against the
 * preview revision, then write the dial only when reconciliation applied.
 *
 * This is one of only two places that write rule files — the other is the
 * `settings` action `sync` headless path. Both are reached by an explicit
 * user action; nothing on a session path writes here.
 *
 * `body.scope` is one decision governing two things: the dial's file and the
 * rule channel. Splitting them across two toggles would ask the user the same
 * question twice and let the answers disagree.
 */
export function persistSave(
  projectRoot: string,
  pluginRoot: string,
  body: SaveBody,
): SaveSummary {
  const ruleDocs = applyRuleDocs(projectRoot, pluginRoot, selectedIds(body), {
    resync: body.ruleDocs.resync,
    revision: body.ruleDocs.revision ?? null,
    scope: body.scope,
  });
  if (!ruleDocs.applied)
    return {
      configWritten: false,
      ruleDocs,
    };

  writeConfig(projectRoot, body.scope, body.config);
  return {
    configWritten: true,
    ruleDocs,
  };
}
