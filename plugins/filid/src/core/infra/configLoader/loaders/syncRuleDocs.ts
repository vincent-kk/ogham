import { ruleDocsTarget } from '@ogham/cross-platform/host-paths';

import { resolveGitRoot } from '../utils/resolveGitRoot.js';
import { resolvePluginRoot } from '../utils/resolvePluginRoot.js';

import { loadRuleDocsManifest } from './loadRuleDocsManifest.js';
import type {
  RuleDocSyncResult,
  RuleDocsManifest,
  SyncRuleDocsOptions,
} from './manifestTypes.js';
import { syncRuleDocsToDirectory } from './syncRuleDocsToDirectory.js';
import { syncRuleDocsToFile } from './syncRuleDocsToFile.js';

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
 * This function MUST be invoked exclusively from the setup skill. It is
 * safe to call repeatedly (idempotent relative to the selection + resync inputs).
 *
 * @param projectRoot - Target project (git root resolved internally)
 * @param selection - Rule ids the user has explicitly opted into; required rules are enforced from the manifest
 * @param opts - Optional resync ids and plugin root override
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

  const plan = {
    pluginRoot: root,
    projectRoot: resolveGitRoot(projectRoot),
    manifest,
    selection: new Set(selection),
    resync: new Set(opts.resync ?? []),
  };

  const target = ruleDocsTarget();
  return target.kind === 'merge'
    ? syncRuleDocsToFile(plan, target.file, result)
    : syncRuleDocsToDirectory(plan, target.path, result);
}
