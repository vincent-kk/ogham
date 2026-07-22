import type {
  RuleDocSyncResult,
  SyncRuleDocsOptions,
} from '../../../types/manifest.js';
import { collectRuleDocDecisions } from '../utils/collectRuleDocDecisions.js';

/**
 * Dry-run a sync: report what `applyRuleDocs` would do to `.claude/rules/`
 * without touching a single file.
 *
 * seiri shows this before it writes. Rule docs become standing
 * instructions the model reads every session, so the user gets to see
 * what is about to be installed in their repository first.
 */
export function planRuleDocs(
  projectRoot: string,
  pluginRoot: string,
  selection: Iterable<string>,
  opts: SyncRuleDocsOptions = {},
): RuleDocSyncResult {
  const records = collectRuleDocDecisions(
    projectRoot,
    pluginRoot,
    selection,
    opts.resync ?? [],
  );

  return {
    applied: false,
    outcomes: records.map(({ entry, decision }) => ({
      id: entry.id,
      filename: entry.filename,
      action: decision.action,
      reason: decision.reason,
    })),
  };
}
