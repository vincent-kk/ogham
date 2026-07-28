import { resolvePluginRoot } from '../utils/resolvePluginRoot.js';

import { createFilidRuleManager } from './createFilidRuleManager.js';
import { loadManagedRuleDocuments } from './loadManagedRuleDocuments.js';
import { loadRuleDocsManifest } from './loadRuleDocsManifest.js';
import type {
  RuleDocSyncResult,
  RuleDocsManifest,
  SyncRuleDocsOptions,
} from './manifestTypes.js';
import { mapRuleSyncResult } from './mapRuleSyncResult.js';
import { retireOtherScopeRuleDocs } from './retireOtherScopeRuleDocs.js';

/**
 * Synchronise the host's rule-document channel with the desired selection.
 *
 * Which channel that is depends on the host: Claude reads a directory of markdown files
 * (`.claude/rules/`), Codex reads a single instruction file and no directory at all, so
 * there each document becomes a marker-delimited section of `AGENTS.md`. Writing to the
 * wrong one is not an error — the files appear and the model never sees them — which is
 * why the target is resolved rather than assumed.
 *
 * Behaviour per entry, in either channel:
 * - required OR selected + absent → deploy from the plugin template
 * - required OR selected + present + matches template → unchanged
 * - required + present + differs → redeploy (auto-update)
 * - optional selected + present + differs + id ∈ resync → redeploy (updated)
 * - optional selected + present + differs + id ∉ resync → drift reported, left untouched
 * - not selected + present → removed
 * - not selected + absent → unchanged
 *
 * This function MUST be invoked exclusively from setup surfaces: the
 * settings page server (`open_settings`, interactive path) or the
 * `rule_docs_sync` tool driven by the setup skill (headless/CI fallback).
 * It is safe to call repeatedly (idempotent relative to the selection +
 * resync inputs).
 *
 * Which config layer receives the documents is `opts.scope`. Naming one is a
 * placement decision, so the sync writes that layer and then withdraws the
 * owned documents from the other, reporting them in `result.otherScope`.
 * Omitting it deploys to `project` and leaves the user layer untouched — a
 * headless caller that never chose a layer must not erase a global deployment.
 *
 * @param projectRoot - Target project (git root resolved internally)
 * @param selection - Rule ids the user has explicitly opted into; required rules are enforced from the manifest
 * @param opts - Optional config layer, resync ids and plugin root override
 */
export function syncRuleDocs(
  projectRoot: string,
  selection: Iterable<string>,
  opts: SyncRuleDocsOptions = {},
): RuleDocSyncResult {
  const result: RuleDocSyncResult = {
    copied: [],
    removed: [],
    unchanged: [],
    updated: [],
    drift: [],
    skipped: [],
  };

  const root = resolvePluginRoot(opts.pluginRoot);
  if (root === null) {
    result.skipped.push({
      id: '*',
      reason: 'plugin root could not be resolved and no pluginRoot provided',
    });
    return result;
  }

  let manifest: RuleDocsManifest;
  try {
    manifest = loadRuleDocsManifest(root);
  } catch (err) {
    result.skipped.push({
      id: '*',
      reason: `manifest load failed: ${(err as Error).message}`,
    });
    return result;
  }

  const manager = createFilidRuleManager(projectRoot, opts.scope);
  if (manager === null) {
    result.skipped.push({
      id: '*',
      reason: 'runtime host is unsupported for rule document deployment',
    });
    return result;
  }

  try {
    const documents = loadManagedRuleDocuments(root, manifest);
    const selected = new Set(selection);
    const resync = new Set(opts.resync ?? []);
    const desired = new Set(
      manifest.rules
        .filter((entry) => entry.required || selected.has(entry.id))
        .map((entry) => entry.id),
    );
    const replaceDrift = new Set(
      manifest.rules
        .filter((entry) => entry.required || resync.has(entry.id))
        .map((entry) => entry.id),
    );
    const plan = manager.plan({ documents, desired, replaceDrift });
    const synced = mapRuleSyncResult(manager.apply(plan), manifest);

    // Retirement runs after the write, never before: reversed, a failure
    // between the two steps leaves the rules deployed in neither layer.
    const retired =
      opts.scope === undefined
        ? null
        : retireOtherScopeRuleDocs(
            projectRoot,
            opts.scope,
            documents,
            manifest,
          );
    return retired === null ? synced : { ...synced, otherScope: retired };
  } catch (err) {
    result.skipped.push({
      id: '*',
      reason: `rule document sync failed: ${(err as Error).message}`,
    });
    return result;
  }
}
