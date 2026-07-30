import type { ArtifactOutcome } from '@ogham/agent-artifacts';

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
import { retireOtherScopeRules } from '../utils/retireOtherScopeRules.js';

/**
 * Reconcile the chosen layer's rule channel with the user's selection, then
 * empty the other layer of this owner's documents.
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
  const revision = createRulePlanRevision(plan);
  const hasPreviewRevision = Object.prototype.hasOwnProperty.call(
    opts,
    'revision',
  );

  if (hasPreviewRevision && opts.revision !== revision) {
    const outcomes: ArtifactOutcome[] = plan.outcomes.map((outcome) => ({
      id: outcome.id,
      action: 'conflict',
      target: outcome.target,
      reason: 'preview is stale; refresh before saving',
    }));
    return mapRuleSyncResult({
      applied: false,
      outcomes,
      manifest,
      revision,
    });
  }

  const applied = manager.apply(plan);
  const applyConflicted = applied.outcomes.some(
    (outcome) => outcome.action === 'conflict',
  );
  const nextPlan = manager.plan(request);
  const result = mapRuleSyncResult({
    applied: !applyConflicted,
    outcomes: applied.outcomes,
    manifest,
    revision: createRulePlanRevision(nextPlan),
  });

  // The old copies go only once the new ones are on disk, and only when the
  // write actually landed — retiring after a conflict would leave the rules
  // at neither layer.
  if (applyConflicted) return result;
  const otherScope = retireOtherScopeRules(projectRoot, documents, scope);
  return otherScope === null ? result : { ...result, otherScope };
}
