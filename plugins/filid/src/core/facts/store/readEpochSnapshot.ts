import { readFileSync } from 'node:fs';

import { z } from 'zod';

import type { ResolutionEpochSnapshot } from '../epoch/computeResolutionEpoch.js';

/** Shape of the persisted epoch snapshot; an off-shape file reads as absent. */
const EPOCH_SNAPSHOT_SCHEMA = z
  .object({
    resolutionEpoch: z.string().min(1),
    scannedPaths: z.array(z.string()),
    resolutionInputs: z.array(
      z
        .object({ path: z.string(), contentHash: z.string().nullable() })
        .strict(),
    ),
  })
  .strict();

/**
 * Read the epoch snapshot filid last computed for a project.
 *
 * This is what lets `facts-epoch-moved` name the added and removed paths instead
 * of only reporting that the epoch differs. It is a hint, not state the contract
 * depends on: when it is absent, stale or damaged the caller still gets the new
 * epoch, with empty difference lists rather than guessed ones.
 *
 * @param path - Absolute path of the snapshot file.
 * @returns The snapshot, or null when none can be read.
 */
export function readEpochSnapshot(
  path: string,
): ResolutionEpochSnapshot | null {
  try {
    const parsed = EPOCH_SNAPSHOT_SCHEMA.safeParse(
      JSON.parse(readFileSync(path, 'utf8')),
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
