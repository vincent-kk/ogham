import { mkdirSync, readFileSync, unlinkSync } from 'node:fs';

import { portableDirname } from '@ogham/cross-platform/compat';

import type {
  RuleDocOutcome,
  RuleDocSyncResult,
  SyncRuleDocsOptions,
} from '../../../types/manifest.js';
import { writeAtomically } from '../../utils/writeAtomically.js';
import { collectRuleDocDecisions } from '../utils/collectRuleDocDecisions.js';

/**
 * Reconcile `.claude/rules/` with the user's selection.
 *
 * Only setup surfaces call this — the settings page's save handler, or
 * the `rule_docs_sync` tool as a headless fallback. Session hooks never
 * do: every change to a project's rule files is the result of an explicit
 * user action.
 *
 * A per-entry failure is recorded as `skip` with its reason and the loop
 * continues, so a partial failure reports exactly what did and did not
 * land rather than aborting halfway with no account of it.
 */
export function applyRuleDocs(
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

  const outcomes: RuleDocOutcome[] = records.map(
    ({ entry, decision, destPath, templatePath }) => {
      const outcome: RuleDocOutcome = {
        id: entry.id,
        filename: entry.filename,
        action: decision.action,
        reason: decision.reason,
      };

      try {
        if (decision.write) {
          mkdirSync(portableDirname(destPath), { recursive: true });
          writeAtomically(destPath, readFileSync(templatePath));
        } else if (decision.remove) unlinkSync(destPath);
      } catch (err) {
        return {
          id: entry.id,
          filename: entry.filename,
          action: 'skip',
          reason: `${decision.action} failed: ${(err as Error).message}`,
        };
      }

      return outcome;
    },
  );

  return { applied: true, outcomes };
}
