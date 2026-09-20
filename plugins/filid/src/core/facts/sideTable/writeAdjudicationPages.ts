import { FACTS_SCHEMA_VERSION } from '../../../constants/facts.js';
import { writeShardPages } from '../store/writeShardPages.js';
import type {
  ShardPageUpdate,
  ShardWriteOutcome,
} from '../store/writeShardPages.js';

import type { AdjudicationTableContents } from './readAdjudicationTable.js';
import type { AdjudicationItem } from './types/adjudicationTypes.js';

/** One file's page as a caller wants it to end up. */
export interface AdjudicationPageUpdate {
  /** Project-relative POSIX path the page belongs to. */
  path: string;
  /**
   * The page's complete contents afterwards; empty removes the page, unless the
   * file is awaiting a comparison — that mark is the page's whole content.
   */
  items: AdjudicationItem[];
  /**
   * Whether this file still awaits the comparison a discard left it owing.
   *
   * Omitted keeps whatever the stored page says, which is what makes an
   * ordinary submission safe: a planner that knew nothing about the mark would
   * write an empty page over it and return the file to silence.
   */
  awaitingComparison?: boolean;
}

/**
 * What a batch of page writes achieved, and what it lost.
 *
 * The side table stores pages in a shard directory, so what a page batch can
 * report is exactly what a shard batch reports; a second declaration here would
 * be a copy that drifts from the one the write actually returns.
 */
export type AdjudicationWriteOutcome = ShardWriteOutcome;

/**
 * Apply a batch of page updates, one write per shard.
 *
 * The batching and compare-and-set rules live in `writeShardPages`, which the
 * pending attestation store shares; what this adds is the page's stored shape
 * and the rule that an empty item list removes the page rather than storing an
 * empty one. A lost shard is reported by path so the caller can turn it into a
 * diagnostic rather than a number that overstates what was kept.
 *
 * The awaiting-comparison mark is carried forward here rather than by each
 * planner: one place holds the rule, so no page write can drop the mark by not
 * knowing about it, and a page that holds nothing but the mark survives.
 *
 * @param directory - Side-table directory.
 * @param table - The table as this call read it, carrying the write tokens.
 * @param updates - Page updates keyed by path digest.
 * @param shardFileName - Maps a path digest to its shard file.
 * @returns Which pages landed, which paths lost their shard, and the shards
 * this batch replaced, for a second batch in the same call to chain from.
 */
export function writeAdjudicationPages(
  directory: string,
  table: AdjudicationTableContents,
  updates: ReadonlyMap<string, AdjudicationPageUpdate>,
  shardFileName: (pathDigest: string) => string,
): AdjudicationWriteOutcome {
  const pages = new Map<string, ShardPageUpdate>();
  for (const [key, update] of updates) {
    const awaiting =
      update.awaitingComparison ??
      table.pages.get(key)?.awaitingComparison ??
      false;
    pages.set(key, {
      path: update.path,
      document:
        update.items.length === 0 && !awaiting
          ? null
          : {
              schemaVersion: FACTS_SCHEMA_VERSION,
              path: update.path,
              items: update.items,
              ...(awaiting ? { awaitingComparison: true } : {}),
            },
    });
  }
  return writeShardPages(
    directory,
    table.shards,
    pages,
    shardFileName,
    table.damaged,
  );
}
