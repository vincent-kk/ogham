import type { ArtifactOutcome } from '@ogham/agent-artifacts';

import type {
  RuleDocAction,
  RuleDocOutcome,
  RuleDocSyncResult,
  RuleDocsManifest,
} from '../../../types/manifest.js';

export function mapRuleSyncResult(options: {
  readonly applied: boolean;
  readonly outcomes: readonly ArtifactOutcome[];
  readonly manifest: RuleDocsManifest;
  readonly revision?: string;
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
      outcome.action === 'skip'
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
    ...(options.revision === undefined ? {} : { revision: options.revision }),
  };
}
