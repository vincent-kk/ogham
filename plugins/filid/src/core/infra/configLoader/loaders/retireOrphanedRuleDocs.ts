import { existsSync, readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

import type { RuleDocSyncResult, RuleDocsManifest } from './manifestTypes.js';

/**
 * Retire `<namespace>_*.md` files this plugin no longer ships (its own
 * namespace, yet absent from the manifest) — a rule dropped in an earlier
 * version. The namespace is derived from the manifest, so adding or
 * removing a rule needs no code change. Runs only from `syncRuleDocs` (a
 * setup surface), never a session hook, so the extra directory read stays
 * off the hot path. Mutates `result.removed` / `result.skipped` in place.
 */
export function retireOrphanedRuleDocs(
  manifest: RuleDocsManifest,
  rulesDir: string,
  result: RuleDocSyncResult,
): void {
  const namespace = manifest.rules[0]?.filename.split('_')[0];
  if (!namespace || !existsSync(rulesDir)) return;

  let files: string[];
  try {
    files = readdirSync(rulesDir);
  } catch (err) {
    result.skipped.push({
      id: '*',
      reason: `orphan scan failed: ${(err as Error).message}`,
    });
    return;
  }

  const shipped = new Set(manifest.rules.map((r) => r.filename));
  for (const file of files) {
    if (
      !file.startsWith(`${namespace}_`) ||
      !file.endsWith('.md') ||
      shipped.has(file)
    )
      continue;
    try {
      unlinkSync(join(rulesDir, file));
      result.removed.push(file);
    } catch (err) {
      result.skipped.push({
        id: file,
        reason: `retire failed: ${(err as Error).message}`,
      });
    }
  }
}
