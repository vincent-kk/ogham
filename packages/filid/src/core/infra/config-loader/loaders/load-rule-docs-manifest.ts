import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { RuleDocsManifest } from './manifest-types.js';

/**
 * Load and validate the rule docs manifest shipped with the filid plugin.
 * Throws if the manifest is missing, malformed, or any entry is missing a
 * `templateHash` (which indicates `scripts/sync-rule-hashes.mjs` was skipped).
 */
export function loadRuleDocsManifest(pluginRoot: string): RuleDocsManifest {
  const manifestPath = join(pluginRoot, 'templates', 'rules', 'manifest.json');
  if (!existsSync(manifestPath)) {
    throw new Error(`rule docs manifest not found at ${manifestPath}`);
  }
  const raw = readFileSync(manifestPath, 'utf8');
  const parsed = JSON.parse(raw) as RuleDocsManifest;
  if (!parsed || !Array.isArray(parsed.rules)) {
    throw new Error(`rule docs manifest has invalid shape at ${manifestPath}`);
  }
  for (const entry of parsed.rules) {
    if (!entry.templateHash || typeof entry.templateHash !== 'string') {
      // Pre-0.3.5 manifests lack `templateHash`. Upgraders MUST run
      // `yarn filid build` (which triggers scripts/sync-rule-hashes.mjs) to
      // repopulate the manifest before invoking /filid:filid-setup. The
      // `syncRuleDocs()` caller wraps this throw into `skipped: [{id: '*', ...}]`.
      throw new Error(
        `rule docs manifest entry "${entry.id}" is missing templateHash — run \`node scripts/sync-rule-hashes.mjs\``,
      );
    }
  }
  return parsed;
}
