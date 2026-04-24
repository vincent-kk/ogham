import { existsSync, mkdirSync, renameSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

import { createLogger } from '../../../../lib/logger.js';
import { computeFileSha256 } from '../utils/compute-file-sha256.js';
import { resolveGitRoot } from '../utils/resolve-git-root.js';
import { resolvePluginRoot } from '../utils/resolve-plugin-root.js';
import { writeFileAtomically } from '../utils/write-file-atomically.js';
import { loadRuleDocsManifest } from './load-rule-docs-manifest.js';
import type {
  RuleDocSyncResult,
  RuleDocsManifest,
  SyncRuleDocsOptions,
} from './manifest-types.js';

const log = createLogger('config-loader');

/**
 * Synchronise `.claude/rules/` with the desired selection.
 *
 * Behaviour per entry:
 * - required OR selected + file absent → copy from plugin template
 * - required OR selected + file present + hash matches template → unchanged
 * - required + file present + hash differs → overwrite with template (auto-update)
 * - optional selected + file present + hash differs + id ∈ resync → overwrite (updated)
 * - optional selected + file present + hash differs + id ∉ resync → drift reported, file untouched
 * - not selected + file present → removed
 * - not selected + file absent → unchanged
 *
 * This function MUST be invoked exclusively from the filid-setup skill. It is
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
      reason: 'CLAUDE_PLUGIN_ROOT not set and no pluginRoot provided',
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

  const resolvedRoot = resolveGitRoot(projectRoot);
  const rulesDir = join(resolvedRoot, '.claude', 'rules');
  const selectionSet = new Set(selection);
  const resyncSet = new Set(opts.resync ?? []);

  // --- Legacy filename migration ---
  // Rename old-named files (e.g. fca.md → filid_fca-policy.md)
  // so the main loop sees them under the current name. User edits are preserved
  // because renameSync is a metadata-only operation (no content rewrite).
  for (const entry of manifest.rules) {
    if (!entry.legacyFilename) continue;
    const legacyPath = join(rulesDir, entry.legacyFilename);
    const newPath = join(rulesDir, entry.filename);
    if (existsSync(legacyPath) && !existsSync(newPath)) {
      try {
        renameSync(legacyPath, newPath);
        log.debug(
          `migrated rule doc: ${entry.legacyFilename} → ${entry.filename}`,
        );
      } catch (err) {
        log.error(`failed to migrate ${entry.legacyFilename}`, err);
      }
    }
  }

  for (const entry of manifest.rules) {
    const desired = entry.required || selectionSet.has(entry.id);
    const destPath = join(rulesDir, entry.filename);
    const templatePath = join(root, 'templates', 'rules', entry.filename);
    const destExists = existsSync(destPath);

    if (desired) {
      if (!destExists) {
        if (!existsSync(templatePath)) {
          result.skipped.push({
            id: entry.id,
            reason: `template missing at ${templatePath}`,
          });
          continue;
        }
        try {
          mkdirSync(rulesDir, { recursive: true });
          writeFileAtomically(templatePath, destPath);
          result.copied.push(entry.filename);
        } catch (err) {
          result.skipped.push({
            id: entry.id,
            reason: `copy failed: ${(err as Error).message}`,
          });
        }
        continue;
      }

      // Deployed — check for drift against the template hash.
      const deployedHash = computeFileSha256(destPath);
      if (deployedHash !== null && deployedHash === entry.templateHash) {
        result.unchanged.push(entry.filename);
        continue;
      }

      // Drift detected (or deployedHash unreadable → treat as drift).
      const shouldResync = entry.required || resyncSet.has(entry.id);
      if (!shouldResync) {
        result.drift.push(entry.filename);
        continue;
      }
      if (!existsSync(templatePath)) {
        result.skipped.push({
          id: entry.id,
          reason: `template missing at ${templatePath}`,
        });
        continue;
      }
      try {
        writeFileAtomically(templatePath, destPath);
        result.updated.push(entry.filename);
      } catch (err) {
        result.skipped.push({
          id: entry.id,
          reason: `update failed: ${(err as Error).message}`,
        });
      }
      continue;
    }

    // not desired
    if (!destExists) {
      result.unchanged.push(entry.filename);
      continue;
    }
    try {
      unlinkSync(destPath);
      result.removed.push(entry.filename);
    } catch (err) {
      result.skipped.push({
        id: entry.id,
        reason: `remove failed: ${(err as Error).message}`,
      });
    }
  }

  return result;
}
