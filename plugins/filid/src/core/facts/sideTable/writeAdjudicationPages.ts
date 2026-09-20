import { FACTS_SCHEMA_VERSION } from '../../../constants/facts.js';
import { writeFactsShardFile } from '../store/writeFactsShardFile.js';

import type { AdjudicationTableContents } from './readAdjudicationTable.js';
import type { AdjudicationItem } from './types/adjudicationTypes.js';

/** One file's page as a caller wants it to end up. */
export interface AdjudicationPageUpdate {
  /** Project-relative POSIX path the page belongs to. */
  path: string;
  /** The page's complete contents afterwards; empty removes the page. */
  items: AdjudicationItem[];
}

/** What a batch of page writes achieved, and what it lost. */
export interface AdjudicationWriteOutcome {
  /** Path digests whose page is now on disk as asked. */
  stored: Set<string>;
  /** Paths whose shard another writer took, sorted. */
  conflicted: string[];
}

/**
 * Apply a batch of page updates, one write per shard.
 *
 * Grouping is not an optimization here, it is correctness. A shard's
 * compare-and-set token is read once per call, so writing the same shard twice
 * in one call makes the second write lose against the first — and with 256
 * shards, a batch of a few dozen files collides almost surely. Writing per page
 * therefore dropped items while reporting them as stored, which is exactly the
 * silent shrinking the side table exists to prevent.
 *
 * A shard whose token no longer matches is left untouched and every path that
 * was to land in it is reported: the caller turns that into a diagnostic the
 * agent can act on rather than a number that overstates what was kept.
 *
 * @param directory - Side-table directory.
 * @param table - The table as this call read it, carrying the write tokens.
 * @param updates - Page updates keyed by path digest.
 * @param shardFileName - Maps a path digest to its shard file.
 * @returns Which pages landed and which paths lost their shard.
 */
export function writeAdjudicationPages(
  directory: string,
  table: AdjudicationTableContents,
  updates: ReadonlyMap<string, AdjudicationPageUpdate>,
  shardFileName: (pathDigest: string) => string,
): AdjudicationWriteOutcome {
  const byShard = new Map<string, string[]>();
  for (const key of updates.keys()) {
    const shard = shardFileName(key);
    byShard.set(shard, [...(byShard.get(shard) ?? []), key]);
  }
  const outcome: AdjudicationWriteOutcome = {
    stored: new Set<string>(),
    conflicted: [],
  };
  for (const [shard, keys] of byShard) {
    const existing = table.shards.get(shard);
    const entries = { ...(existing?.entries ?? {}) };
    let changed = false;
    for (const key of keys) {
      const update = updates.get(key) as AdjudicationPageUpdate;
      if (update.items.length === 0) {
        if (key in entries) {
          delete entries[key];
          changed = true;
        }
        continue;
      }
      entries[key] = {
        schemaVersion: FACTS_SCHEMA_VERSION,
        path: update.path,
        items: update.items,
      };
      changed = true;
    }
    if (!changed) {
      for (const key of keys) outcome.stored.add(key);
      continue;
    }
    if (
      writeFactsShardFile(directory, shard, entries, existing?.digest ?? null)
    ) {
      for (const key of keys) outcome.stored.add(key);
      continue;
    }
    for (const key of keys)
      outcome.conflicted.push(
        (updates.get(key) as AdjudicationPageUpdate).path,
      );
  }
  outcome.conflicted.sort((left, right) => left.localeCompare(right));
  return outcome;
}
