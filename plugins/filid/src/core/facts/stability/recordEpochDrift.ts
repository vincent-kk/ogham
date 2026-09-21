import { readFileSync } from 'node:fs';

import { writeFileAtomicallySync } from '@ogham/cross-platform';
import { z } from 'zod';

import { FACTS_EPOCH_DRIFT_LIMIT } from '../../../constants/facts.js';

/** Persisted counter shape; an off-shape file restarts the count. */
const DRIFT_SCHEMA = z
  .object({ epochs: z.array(z.string()) })
  .strict();

/** Whether the tree has moved so often that re-extracting cannot converge. */
export interface EpochDriftVerdict {
  /** Times the tree moved between refusals, since the last successful submit. */
  consecutive: number;
  /** True at the limit, which is what `facts-tree-unstable` reports. */
  unstable: boolean;
}

/**
 * Count one epoch rejection, or clear the count after a success.
 *
 * What is counted is the tree MOVING between refusals, not refusals themselves.
 * A caller that resubmits against the same stale epoch is making one mistake
 * repeatedly, not observing a moving tree, so a repeat of the epoch already
 * recorded adds nothing. The first refusal only establishes the baseline: it
 * says the caller's epoch was old, which is the ordinary case this whole
 * mechanism exists to recover from, not evidence of instability. A successful
 * submit clears the sequence, and the stored sequence never grows past what the
 * verdict needs.
 *
 * The count is keyed by project and persisted beside the records rather than
 * held in server memory. Caller identity is not something the server can
 * establish — `submit` carries no actor, and the spec leaves actor claims
 * self-declared — so the project is the honest unit; persisting it means an MCP
 * server restart, which happens once per session, cannot silently reset a guard
 * whose whole purpose is to stop an unbounded retry loop.
 *
 * @param path - Absolute path of the counter file.
 * @param newEpoch - The epoch just reported to the caller, or null to clear the
 * sequence after a successful submit.
 * @returns The sequence length and whether it reached the limit.
 */
export function recordEpochDrift(
  path: string,
  newEpoch: string | null,
): EpochDriftVerdict {
  if (newEpoch === null) {
    writeDrift(path, []);
    return { consecutive: 0, unstable: false };
  }
  const previous = readDrift(path);
  const epochs =
    previous[previous.length - 1] === newEpoch
      ? previous
      : [...previous, newEpoch].slice(-(FACTS_EPOCH_DRIFT_LIMIT + 1));
  writeDrift(path, epochs);
  const moves = Math.max(0, epochs.length - 1);
  return { consecutive: moves, unstable: moves >= FACTS_EPOCH_DRIFT_LIMIT };
}

/**
 * Read the persisted epoch sequence.
 * @param path Absolute path of the counter file.
 * @returns The stored epochs, or an empty sequence when none can be read.
 */
function readDrift(path: string): string[] {
  try {
    const parsed = DRIFT_SCHEMA.safeParse(JSON.parse(readFileSync(path, 'utf8')));
    return parsed.success ? parsed.data.epochs : [];
  } catch {
    return [];
  }
}

/**
 * Persist the epoch sequence, ignoring a failed write.
 * @param path Absolute path of the counter file.
 * @param epochs Sequence to store.
 */
function writeDrift(path: string, epochs: readonly string[]): void {
  try {
    writeFileAtomicallySync(path, JSON.stringify({ epochs }));
  } catch {
    return;
  }
}
