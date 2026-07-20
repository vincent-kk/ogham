import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  mergeSection,
  readSection,
  removeSection,
} from '@ogham/cross-platform/instructions';

import { ruleDocMarkers } from '../../../../constants/ruleDocs.js';
import { writeTextAtomically } from '../utils/writeTextAtomically.js';

import type { RuleDocSyncPlan, RuleDocSyncResult } from './manifestTypes.js';

/**
 * Deploy rule documents as marker-delimited sections of a single instruction file.
 *
 * This is Codex's channel: it reads `AGENTS.md` and no rules directory, so a directory
 * of markdown files there is not an error — it is a silent no-op, the failure mode this
 * whole split exists to remove.
 *
 * The whole file is rewritten once, after every entry has had its say. A per-entry write
 * would leave the user's instruction file half-updated if one entry failed, and the host
 * reads that file on every turn.
 *
 * Drift is decided by comparing bodies rather than the manifest's `templateHash`: that
 * hash is over the template's raw bytes, and a section body is the trimmed content, so
 * the two can never be equal even when the deployment is perfect.
 *
 * @param plan - Resolved roots, manifest, and the caller's selection
 * @param filename - Instruction file, relative to the project root
 */
export function syncRuleDocsToFile(
  plan: RuleDocSyncPlan,
  filename: string,
  result: RuleDocSyncResult,
): RuleDocSyncResult {
  const filePath = join(plan.projectRoot, filename);
  const original = existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
  let content = original;

  for (const entry of plan.manifest.rules) {
    const desired = entry.required || plan.selection.has(entry.id);
    const markers = ruleDocMarkers(entry.filename);
    const deployedBody = readSection(content, markers);

    if (!desired) {
      const withoutSection = removeSection(content, markers);
      if (withoutSection === null) {
        result.unchanged.push(entry.filename);
        continue;
      }
      content = withoutSection;
      result.removed.push(entry.filename);
      continue;
    }

    const templatePath = join(
      plan.pluginRoot,
      'templates',
      'rules',
      entry.filename,
    );
    if (!existsSync(templatePath)) {
      result.skipped.push({
        id: entry.id,
        reason: `template missing at ${templatePath}`,
      });
      continue;
    }
    const templateBody = readFileSync(templatePath, 'utf8').trim();

    if (deployedBody === null) {
      content = mergeSection(content, markers, templateBody);
      result.copied.push(entry.filename);
      continue;
    }
    if (deployedBody === templateBody) {
      result.unchanged.push(entry.filename);
      continue;
    }

    const shouldResync = entry.required || plan.resync.has(entry.id);
    if (!shouldResync) {
      result.drift.push(entry.filename);
      continue;
    }
    content = mergeSection(content, markers, templateBody);
    result.updated.push(entry.filename);
  }

  if (content === original) return result;

  try {
    writeTextAtomically(filePath, content);
  } catch (err) {
    // Nothing landed, so nothing may be reported as landed. `unchanged` and `drift`
    // still hold — they describe the file as it remains on disk.
    return {
      copied: [],
      removed: [],
      unchanged: result.unchanged,
      updated: [],
      drift: result.drift,
      skipped: [
        ...result.skipped,
        { id: '*', reason: `write failed: ${(err as Error).message}` },
      ],
    };
  }

  return result;
}
