import { existsSync, readdirSync } from 'node:fs';

import { loadManifest } from '../loaders/loadManifest.js';

import { resolveRulesDir } from './resolveRulesDir.js';

/**
 * Filenames of retired rule docs: `<namespace>_*.md` files this plugin no
 * longer ships — its own namespace, yet absent from the manifest, i.e. a rule
 * dropped in an earlier version. The namespace is derived from the manifest,
 * so adding or removing a rule needs no code change here. Pure detection — the
 * caller previews them (`planRuleDocs`) or deletes them (`applyRuleDocs`), so
 * the dry-run and the write can never disagree on what gets retired.
 */
export function detectOrphanedDocs(
  projectRoot: string,
  pluginRoot: string,
): string[] {
  const rulesDir = resolveRulesDir(projectRoot);
  if (!existsSync(rulesDir)) return [];
  const rules = loadManifest(pluginRoot).rules;
  const namespace = rules[0]?.filename.split('_')[0];
  if (!namespace) return [];
  const shipped = new Set(rules.map((r) => r.filename));
  return readdirSync(rulesDir).filter(
    (file) =>
      file.startsWith(`${namespace}_`) &&
      file.endsWith('.md') &&
      !shipped.has(file),
  );
}
