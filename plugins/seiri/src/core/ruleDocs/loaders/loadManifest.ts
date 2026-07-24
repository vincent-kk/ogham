import { readFileSync } from 'node:fs';

import type { RuleDocsManifest } from '../../../types/manifest.js';
import { resolveManifestPath } from '../utils/resolveTemplatePath.js';

/**
 * Load and validate the rule manifest shipped with the plugin.
 *
 * Throws — unlike `loadConfig`, a broken manifest is a build defect, not a
 * user state. A missing `templateHash` in particular means
 * `scripts/sync-rule-hashes.mjs` was skipped, which would make every
 * deployed file look like drift. Callers on session paths translate the
 * throw into "no rules reported" rather than letting it surface.
 */
export function loadManifest(pluginRoot: string): RuleDocsManifest {
  const manifestPath = resolveManifestPath(pluginRoot);
  const parsed = JSON.parse(
    readFileSync(manifestPath, 'utf8'),
  ) as RuleDocsManifest;

  if (!parsed || !Array.isArray(parsed.rules))
    throw new Error(`rule manifest has an invalid shape at ${manifestPath}`);

  for (const entry of parsed.rules)
    if (!entry.templateHash || typeof entry.templateHash !== 'string')
      throw new Error(
        `rule manifest entry "${entry.id}" is missing templateHash — run \`node scripts/sync-rule-hashes.mjs\``,
      );

  return parsed;
}
