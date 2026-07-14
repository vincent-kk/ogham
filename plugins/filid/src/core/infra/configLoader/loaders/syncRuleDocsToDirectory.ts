import { existsSync, mkdirSync, renameSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

import { createLogger } from '../../../../lib/logger.js';
import { computeFileSha256 } from '../utils/computeFileSha256.js';
import { writeFileAtomically } from '../utils/writeFileAtomically.js';

import type { RuleDocSyncPlan, RuleDocSyncResult } from './manifestTypes.js';

const log = createLogger('config-loader');

/**
 * Deploy rule documents as one file each, under the host's rules directory.
 *
 * This is Claude's channel and the original behaviour of `syncRuleDocs` — unchanged, so
 * that the host the plugin already works on cannot regress.
 *
 * @param plan - Resolved roots, manifest, and the caller's selection
 * @param rulesPath - Rules directory, relative to the project root
 */
export function syncRuleDocsToDirectory(
  plan: RuleDocSyncPlan,
  rulesPath: string,
  result: RuleDocSyncResult,
): RuleDocSyncResult {
  const rulesDir = join(plan.projectRoot, rulesPath);

  // --- Legacy filename migration ---
  // Rename old-named files (e.g. fca.md → filid_fca-policy.md)
  // so the main loop sees them under the current name. User edits are preserved
  // because renameSync is a metadata-only operation (no content rewrite).
  for (const entry of plan.manifest.rules) {
    if (!entry.legacyFilename) continue;
    const legacyPath = join(rulesDir, entry.legacyFilename);
    const newPath = join(rulesDir, entry.filename);
    if (existsSync(legacyPath) && !existsSync(newPath))
      try {
        renameSync(legacyPath, newPath);
        log.debug(
          `migrated rule doc: ${entry.legacyFilename} → ${entry.filename}`,
        );
      } catch (err) {
        log.error(`failed to migrate ${entry.legacyFilename}`, err);
      }
  }

  for (const entry of plan.manifest.rules) {
    const desired = entry.required || plan.selection.has(entry.id);
    const destPath = join(rulesDir, entry.filename);
    const templatePath = join(
      plan.pluginRoot,
      'templates',
      'rules',
      entry.filename,
    );
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
      const shouldResync = entry.required || plan.resync.has(entry.id);
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
