import {
  loadRuleDocsManifest,
  resolvePluginRoot,
} from '../../../../core/infra/configLoader/configLoader.js';

export interface ResyncValidation {
  resyncAccepted: string[];
  preSkipped: Array<{ id: string; reason: string }>;
}

/**
 * Validate resync ids against the rule-docs manifest so unknown entries
 * surface as `skipped` rather than silently no-op. Without a resolvable
 * plugin root or manifest, forward everything and let syncRuleDocs decide
 * (any unknown id is a silent no-op at that layer).
 */
export function validateResyncIds(resyncRaw: string[]): ResyncValidation {
  const pluginRoot = resolvePluginRoot();
  const knownIds = new Set<string>();
  if (pluginRoot)
    try {
      const manifest = loadRuleDocsManifest(pluginRoot);
      for (const entry of manifest.rules) knownIds.add(entry.id);
    } catch {
      // Manifest load failure is handled downstream by syncRuleDocs, which
      // records a `*` skip entry. Skip the pre-validation.
    }

  const resyncAccepted: string[] = [];
  const preSkipped: Array<{ id: string; reason: string }> = [];
  if (knownIds.size > 0)
    for (const id of resyncRaw)
      if (knownIds.has(id)) resyncAccepted.push(id);
      else preSkipped.push({ id, reason: 'unknown rule id' });
  else resyncAccepted.push(...resyncRaw);

  return { resyncAccepted, preSkipped };
}
