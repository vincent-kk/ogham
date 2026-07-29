import type {
  RuleDocSyncResult,
  SyncRuleDocsOptions,
} from '../../../types/manifest.js';
import { loadManagedRuleDocuments } from '../loaders/loadManagedRuleDocuments.js';
import { loadManifest } from '../loaders/loadManifest.js';
import { createRuleDocumentRequest } from '../utils/createRuleDocumentRequest.js';
import { createRulePlanRevision } from '../utils/createRulePlanRevision.js';
import { createSeiriRuleManager } from '../utils/createSeiriRuleManager.js';
import { inspectOtherScopeRules } from '../utils/inspectOtherScopeRules.js';
import { mapRuleSyncResult } from '../utils/mapRuleSyncResult.js';

/**
 * Dry-run a sync against the chosen layer's rule channel without writing.
 *
 * seiri shows this before it writes. Rule docs become standing
 * instructions the model reads every session, so the user gets to see
 * what is about to be installed in their repository first.
 *
 * `otherScope` extends that preview across layers: because a save moves the
 * documents rather than copying them, what the *other* layer is about to lose
 * belongs in the same diff the user approves.
 */
export function planRuleDocs(
  projectRoot: string,
  pluginRoot: string,
  selection: Iterable<string>,
  opts: SyncRuleDocsOptions = {},
): RuleDocSyncResult {
  const scope = opts.scope ?? 'project';
  const manifest = loadManifest(pluginRoot);
  const documents = loadManagedRuleDocuments(pluginRoot, manifest);
  const manager = createSeiriRuleManager(projectRoot, scope);
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
  const result = mapRuleSyncResult({
    applied: false,
    outcomes: plan.outcomes,
    manifest,
    revision: createRulePlanRevision(plan),
  });
  const otherScope = inspectOtherScopeRules(projectRoot, documents, scope);
  return otherScope === null ? result : { ...result, otherScope };
}
