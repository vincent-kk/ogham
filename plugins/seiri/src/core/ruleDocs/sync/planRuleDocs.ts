import type {
  RuleDocSyncResult,
  SyncRuleDocsOptions,
} from '../../../types/manifest.js';
import { loadManagedRuleDocuments } from '../loaders/loadManagedRuleDocuments.js';
import { loadManifest } from '../loaders/loadManifest.js';
import { createRuleDocumentRequest } from '../utils/createRuleDocumentRequest.js';
import { createRulePlanRevision } from '../utils/createRulePlanRevision.js';
import { createSeiriRuleManager } from '../utils/createSeiriRuleManager.js';
import { mapRuleSyncResult } from '../utils/mapRuleSyncResult.js';

/**
 * Dry-run a sync against the active host's rule channel without writing.
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
  const manifest = loadManifest(pluginRoot);
  const documents = loadManagedRuleDocuments(pluginRoot, manifest);
  const manager = createSeiriRuleManager(projectRoot);
  if (manager === null)
    return {
      applied: false,
      outcomes: [
        {
          id: '*',
          filename: '*',
          action: 'skip',
          reason: 'runtime host is unsupported for rule document deployment',
        },
      ],
    };

  const request = createRuleDocumentRequest(
    documents,
    selection,
    opts.resync ?? [],
  );
  const plan = manager.plan(request);
  return mapRuleSyncResult({
    applied: false,
    outcomes: plan.outcomes,
    manifest,
    revision: createRulePlanRevision(plan),
  });
}
