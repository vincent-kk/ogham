import type { ArtifactApplyResult } from '@ogham/agent-artifacts';

import type { RuleDocSyncResult, RuleDocsManifest } from './manifestTypes.js';

/**
 * Maps artifact outcomes without collapsing partial application into skipped documents.
 * @param applied Actual manager outcomes and physical progress.
 * @param manifest Resolves shipped document ids to display filenames.
 * @returns Filename-based outcome groups and the original physical failure details.
 */
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
    ...(applied.partialFailures === undefined
      ? {}
      : { partialFailures: applied.partialFailures }),
  };
  const filenames = new Map(
    manifest.rules.map((entry) => [entry.id, entry.filename] as const),
  );

  for (const outcome of applied.outcomes) {
    const filename = filenames.get(outcome.id) ?? outcome.id;
    if (outcome.action === 'copy') result.copied.push(filename);
    else if (outcome.action === 'remove') result.removed.push(filename);
    else if (outcome.action === 'update') result.updated.push(filename);
    else if (outcome.action === 'partial')
      (result.partial ??= []).push({
        id: outcome.id,
        filename,
        reason: outcome.reason ?? 'file plan partially applied',
      });
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
