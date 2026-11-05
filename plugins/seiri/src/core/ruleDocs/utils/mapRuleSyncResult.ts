import type {
  ArtifactOutcome,
  ArtifactPartialFailure,
} from '@ogham/agent-artifacts';

import type {
  RuleDocAction,
  RuleDocOutcome,
  RuleDocSyncResult,
  RuleDocsManifest,
} from '../../../types/manifest.js';

/**
 * Maps manager outcomes and physical progress into the settings response.
 * @param options Manager result, manifest and optional preview revision.
 * @returns Document outcomes and physical failure details for settings and tool callers.
 */
export function mapRuleSyncResult(options: {
  readonly applied: boolean;
  readonly outcomes: readonly ArtifactOutcome[];
  readonly manifest: RuleDocsManifest;
  readonly revision?: string;
  /** File-level progress to preserve across the plugin response boundary. */
  readonly partialFailures?: readonly ArtifactPartialFailure[];
}): RuleDocSyncResult {
  const filenames = new Map(
    options.manifest.rules.map((entry) => [entry.id, entry.filename] as const),
  );
  const outcomes: RuleDocOutcome[] = options.outcomes.map((outcome) => {
    let action: RuleDocAction;
    if (
      outcome.action === 'copy' ||
      outcome.action === 'remove' ||
      outcome.action === 'update' ||
      outcome.action === 'unchanged' ||
      outcome.action === 'drift' ||
      outcome.action === 'skip' ||
      outcome.action === 'partial'
    )
      action = outcome.action;
    else if (outcome.action === 'relocate') action = 'update';
    else action = 'skip';

    const shippedFilename = filenames.get(outcome.id);
    const reason =
      outcome.reason ??
      (shippedFilename === undefined && action === 'remove'
        ? 'retired: no longer shipped'
        : outcome.action === 'relocate'
          ? 'relocated to the active host target'
          : action === 'skip'
            ? `artifact action: ${outcome.action}`
            : undefined);
    return {
      id: outcome.id,
      filename: shippedFilename ?? outcome.id,
      action,
      ...(reason === undefined ? {} : { reason }),
    };
  });

  return {
    applied: options.applied,
    outcomes,
    ...(options.partialFailures === undefined
      ? {}
      : { partialFailures: options.partialFailures }),
    ...(options.revision === undefined ? {} : { revision: options.revision }),
  };
}
