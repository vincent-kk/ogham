import { TOOL_STATUSES } from '../../../../constants/toolEnvelope.js';
import {
  readPendingStore,
  resolveFactsStorePaths,
  writeShardPages,
} from '../../../../core/facts/index.js';
import type { ShardPageUpdate } from '../../../../core/facts/index.js';
import type { ToolPayload } from '../../../../types/toolEnvelope.js';
import type {
  DiscardPendingInput,
  FactsDiscardPendingData,
  FactsDiscardPendingSummary,
} from '../types/factsToolTypes.js';

import { buildPendingConflictDiagnostics } from './utils/buildPendingConflictDiagnostics.js';

/**
 * Drop the unconfirmed attested submissions for the named files (spec §4.6).
 *
 * This is the only way out of a file two actors keep answering differently: a
 * disagreement stores nothing and leaves the pending attestation standing, so
 * without an explicit discard the two would alternate forever. That is why the
 * action is a component of P5 rather than a convenience, and why it is the one
 * facts action that runs whatever the project's scope says — a removal that can
 * be blocked is a state that cannot be cleared.
 *
 * It touches the pending store and nothing else. Stored records and the
 * adjudication side table are untouched, so this is not a way to delete a
 * record.
 *
 * A path holding no pending attestation is reported, not refused: the caller
 * asked for a state that is already true.
 *
 * @param input - Project root and the project-relative paths to clear.
 * @returns What was discarded and what held nothing.
 */
export async function discardPending(
  input: DiscardPendingInput,
): Promise<ToolPayload<FactsDiscardPendingSummary, FactsDiscardPendingData>> {
  const storePaths = resolveFactsStorePaths(input.path);
  const store = readPendingStore(storePaths.pendingDirectory);
  const updates = new Map<string, ShardPageUpdate>();
  const discarded: string[] = [];
  const absent: string[] = [];
  for (const sourcePath of input.sourcePaths) {
    const key = storePaths.pathDigest(sourcePath);
    if (!store.pages.has(key)) {
      absent.push(sourcePath);
      continue;
    }
    updates.set(key, { path: sourcePath, document: null });
    discarded.push(sourcePath);
  }
  const written = writeShardPages(
    storePaths.pendingDirectory,
    store.shards,
    updates,
    storePaths.shardFileName,
  );
  const kept = new Set(written.conflicted);
  return {
    projectRoot: input.path,
    status:
      written.conflicted.length > 0
        ? TOOL_STATUSES.INDETERMINATE
        : TOOL_STATUSES.OK,
    summary: {
      discarded: discarded.filter((one) => !kept.has(one)).length,
      absent: absent.length,
      stored: written.conflicted.length === 0,
    },
    data: {
      discarded: discarded.filter((one) => !kept.has(one)),
      absent,
    },
    diagnostics: buildPendingConflictDiagnostics(written.conflicted),
  };
}
