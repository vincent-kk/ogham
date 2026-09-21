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
 * @returns The digest of the bytes just written — the token a later write in
 * the same call must carry — or null on a compare-and-set miss. The digest is
 * produced here because this is where the serialization is decided; hashing the
 * same entries outside would be a second copy of that decision.
 */
/** Stands for a shard that exists and cannot be read; never equals a digest. */
const UNREADABLE = Symbol('unreadable shard');

export function writeFactsShardFile(
  directory: string,
  shardFileName: string,
  entries: Record<string, unknown>,
  expectedDigest: string | null,
): string | null {
  const path = join(directory, shardFileName);
  if (currentDigest(path) !== expectedDigest) return null;
  const body = JSON.stringify(entries);
  writeFileAtomicallySync(path, body);
  return createHash('sha256').update(body).digest('hex');
}

/**
 * Digest of a shard file's current bytes.
 * @param path Absolute shard file path.
 * @returns Hex digest, null when no file is there, and `UNREADABLE` when one
 * is there and cannot be read — which no `expectedDigest` ever equals, so the
 * compare-and-set loses rather than replacing bytes nobody could compare.
 */
function currentDigest(path: string): string | null | typeof UNREADABLE {
  try {
    return createHash('sha256').update(readFileSync(path)).digest('hex');
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    return code === 'ENOENT' || code === 'ENOTDIR' ? null : UNREADABLE;
  }
}
