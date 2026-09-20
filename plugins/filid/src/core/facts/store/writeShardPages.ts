import type { FactsShard } from './readShardDirectory.js';
import { writeFactsShardFile } from './writeFactsShardFile.js';

/** One keyed document as a caller wants it to end up. */
export interface ShardPageUpdate {
  /** Project-relative POSIX path the page belongs to, used in reports. */
  path: string;
  /** The document to store, or null to remove the key. */
  document: Record<string, unknown> | null;
}

/** What a batch of page writes achieved, and what it lost. */
export interface ShardWriteOutcome {
  /** Keys whose page is now on disk as asked. */
  stored: Set<string>;
  /** Paths whose shard another writer took, sorted. */
  conflicted: string[];
}

/**
 * Apply a batch of keyed page updates to a shard directory, one write per shard.
 *
 * Grouping is not an optimization here, it is correctness. A shard's
 * compare-and-set token is read once per call, so writing the same shard twice
 * in one call makes the second write lose against the first — and with 256
 * shards, a batch of a few dozen files collides almost surely. Writing per page
 * therefore dropped pages while reporting them as stored.
 *
 * Shared by the adjudication side table and the pending attestation store,
 * which are two directories with the same shape. One implementation means the
 * batching rule cannot be fixed in one of them and missed in the other.
 *
 * @param directory - Shard directory to write into.
 * @param shards - The directory as this call read it, carrying the tokens.
 * @param updates - Page updates keyed by path digest.
 * @param shardFileName - Maps a path digest to its shard file.
 * @returns Which pages landed and which paths lost their shard.
 */
export function writeShardPages(
  directory: string,
  shards: ReadonlyMap<string, FactsShard>,
  updates: ReadonlyMap<string, ShardPageUpdate>,
  shardFileName: (pathDigest: string) => string,
): ShardWriteOutcome {
  const byShard = new Map<string, string[]>();
  for (const key of updates.keys()) {
    const shard = shardFileName(key);
    byShard.set(shard, [...(byShard.get(shard) ?? []), key]);
  }
  const outcome: ShardWriteOutcome = { stored: new Set<string>(), conflicted: [] };
  for (const [shard, keys] of byShard) {
    const existing = shards.get(shard);
    const entries = { ...(existing?.entries ?? {}) };
    let changed = false;
    for (const key of keys) {
      const update = updates.get(key) as ShardPageUpdate;
      if (update.document === null) {
        if (key in entries) {
          delete entries[key];
          changed = true;
        }
        continue;
      }
      entries[key] = update.document;
      changed = true;
    }
    if (!changed || writeFactsShardFile(directory, shard, entries, existing?.digest ?? null)) {
      for (const key of keys) outcome.stored.add(key);
      continue;
    }
    for (const key of keys)
      outcome.conflicted.push((updates.get(key) as ShardPageUpdate).path);
  }
  outcome.conflicted.sort((left, right) => left.localeCompare(right));
  return outcome;
}
