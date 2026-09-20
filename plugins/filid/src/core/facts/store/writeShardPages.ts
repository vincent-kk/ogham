import { compareByBytes } from '../../../lib/compareByBytes.js';
import type { FactsShard, ShardDamage } from './readShardDirectory.js';
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
  /**
   * Shards this batch replaced, as they now stand, keyed by shard file name.
   *
   * A second batch in the same call chains its compare-and-set from these
   * instead of re-reading the directory: a re-read would adopt whatever digest
   * an interleaving writer left, so the check would pass and that writer's page
   * would be overwritten without either caller learning of it.
   */
  shards: Map<string, FactsShard>;
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
 * @param damaged - Shards the directory currently reports as damaged. A
 * damaged shard's entries could not be read, so an ordinary write must not
 * replace it with only the pages this batch happens to know about — that
 * would silently discard whatever the unreadable bytes held. Only
 * `discard-damaged` may write a damaged shard, through its own call.
 * @returns Which pages landed and which paths lost their shard.
 */
export function writeShardPages(
  directory: string,
  shards: ReadonlyMap<string, FactsShard>,
  updates: ReadonlyMap<string, ShardPageUpdate>,
  shardFileName: (pathDigest: string) => string,
  damaged: ReadonlyMap<string, ShardDamage>,
): ShardWriteOutcome {
  const byShard = new Map<string, Array<[string, ShardPageUpdate]>>();
  for (const entry of updates) {
    const [key] = entry;
    const shard = shardFileName(key);
    byShard.set(shard, [...(byShard.get(shard) ?? []), entry]);
  }
  const outcome: ShardWriteOutcome = {
    stored: new Set<string>(),
    conflicted: [],
    shards: new Map<string, FactsShard>(),
  };
  for (const [shard, keys] of byShard) {
    if (damaged.has(shard)) {
      for (const [, update] of keys) outcome.conflicted.push(update.path);
      continue;
    }
    const existing = shards.get(shard);
    const entries = { ...(existing?.entries ?? {}) };
    let changed = false;
    for (const [key, update] of keys) {
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
    const digest = changed
      ? writeFactsShardFile(directory, shard, entries, existing?.digest ?? null)
      : null;
    if (digest !== null) outcome.shards.set(shard, { digest, entries });
    if (!changed || digest !== null) {
      for (const [key] of keys) outcome.stored.add(key);
      continue;
    }
    for (const [, update] of keys) outcome.conflicted.push(update.path);
  }
  outcome.conflicted.sort(compareByBytes);
  return outcome;
}
