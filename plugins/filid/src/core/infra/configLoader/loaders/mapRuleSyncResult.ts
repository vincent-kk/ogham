import type { ArtifactApplyResult } from '@ogham/agent-artifacts';

import type { RuleDocSyncResult, RuleDocsManifest } from './manifestTypes.js';

export function mapRuleSyncResult(
  applied: ArtifactApplyResult,
  manifest: RuleDocsManifest,
): RuleDocSyncResult {
  const result: RuleDocSyncResult = {
    copied: [],
    removed: [],
    unchanged: [],
    updated: [],
    drift: [],
    skipped: [],
  };
  const filenames = new Map(
    manifest.rules.map((entry) => [entry.id, entry.filename] as const),
  );

  for (const outcome of applied.outcomes) {
    const filename = filenames.get(outcome.id) ?? outcome.id;
    if (outcome.action === 'copy') result.copied.push(filename);
    else if (outcome.action === 'remove') result.removed.push(filename);
    else if (outcome.action === 'update') result.updated.push(filename);
    else if (outcome.action === 'drift') result.drift.push(filename);
    else if (outcome.action === 'unchanged' || outcome.action === 'relocate')
      result.unchanged.push(filename);
    else
      result.skipped.push({
        id: outcome.id,
        reason: outcome.reason ?? `artifact action: ${outcome.action}`,
      });
  }

  return result;
}
