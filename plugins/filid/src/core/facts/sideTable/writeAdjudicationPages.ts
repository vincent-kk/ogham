import { FACTS_SCHEMA_VERSION } from '../../../constants/facts.js';
import { writeShardPages } from '../store/writeShardPages.js';
import type { ShardPageUpdate } from '../store/writeShardPages.js';

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
 * The batching and compare-and-set rules live in `writeShardPages`, which the
 * pending attestation store shares; what this adds is the page's stored shape
 * and the rule that an empty item list removes the page rather than storing an
 * empty one. A lost shard is reported by path so the caller can turn it into a
 * diagnostic rather than a number that overstates what was kept.
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
  const pages = new Map<string, ShardPageUpdate>();
  for (const [key, update] of updates)
    pages.set(key, {
      path: update.path,
      document:
        update.items.length === 0
          ? null
          : {
              schemaVersion: FACTS_SCHEMA_VERSION,
              path: update.path,
              items: update.items,
            },
    });
  return writeShardPages(directory, table.shards, pages, shardFileName);
}
