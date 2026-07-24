import type {
  RuleDocOutcome,
  RuleDocSyncResult,
  SyncRuleDocsOptions,
} from '../../../types/manifest.js';
import { collectRuleDocDecisions } from '../utils/collectRuleDocDecisions.js';
import { detectOrphanedDocs } from '../utils/detectOrphanedDocs.js';

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

  const outcomes: RuleDocOutcome[] = records.map(({ entry, decision }) => ({
    id: entry.id,
    filename: entry.filename,
    action: decision.action,
    reason: decision.reason,
  }));
  // Preview the same retirements applyRuleDocs would perform — no deletion.
  for (const filename of detectOrphanedDocs(projectRoot, pluginRoot))
    outcomes.push({
      id: filename,
      filename,
      action: 'remove',
      reason: 'retired: no longer shipped',
    });

  return { applied: false, outcomes };
}
