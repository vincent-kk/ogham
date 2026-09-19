import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { writeFileAtomicallySync } from '@ogham/cross-platform';

/**
 * Replace one shard file under compare-and-set.
 *
 * Two subagents may submit records for the same shard at once, so a blind write
 * would let the loser's records disappear without either caller learning of it.
 * The digest the caller observed when it read the store is compared against the
 * file's current digest immediately before the atomic rename; a mismatch writes
 * nothing and the caller is told to read the store again (spec §2.4,
 * `facts-record-changed`). Sharding makes this a shard-level check rather than a
 * record-level one: a conflict costs the records that shared a shard with a
 * concurrent write, and the recovery is the same resubmission either way. The
 * hook file lock is deliberately not used — it proceeds lockless after 100ms,
 * which is exactly the silent overwrite this guard exists to prevent.
 *
 * @param directory - Facts store directory; created if absent by the write.
 * @param shardFileName - Shard file name derived from a record's path digest.
 * @param entries - The shard's complete contents after this call.
 * @param expectedDigest - Digest observed when the store was read, or null when
 * no file was there.
 * @returns True when the shard was replaced, false on a compare-and-set miss.
 */
export function writeFactsShardFile(
  directory: string,
  shardFileName: string,
  entries: Record<string, unknown>,
  expectedDigest: string | null,
): boolean {
  const path = join(directory, shardFileName);
  if (currentDigest(path) !== expectedDigest) return false;
  writeFileAtomicallySync(path, JSON.stringify(entries));
  return true;
}

/**
 * Digest of a shard file's current bytes.
 * @param path Absolute shard file path.
 * @returns Hex digest, or null when no file is there.
 */
function currentDigest(path: string): string | null {
  try {
    return createHash('sha256').update(readFileSync(path)).digest('hex');
  } catch {
    return null;
  }
}
