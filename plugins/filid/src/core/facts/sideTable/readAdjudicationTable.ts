import { readShardDirectory } from '../store/readShardDirectory.js';
import type { FactsShard } from '../store/readShardDirectory.js';

import { AdjudicationPageSchema } from './adjudicationTableSchema.js';
import type { AdjudicationPage } from './adjudicationTableSchema.js';

/** The side table as it currently sits on disk. */
export interface AdjudicationTableContents {
  /** Shard file name to shard, carrying the compare-and-set tokens. */
  shards: Map<string, FactsShard>;
  /** Path digest to that file's page, for every page that matched the schema. */
  pages: Map<string, AdjudicationPage>;
}

/**
 * Read every adjudication page the side table holds.
 *
 * Same containment as the record store: a page that no longer matches the
 * schema is left out while staying in its shard's raw entries, so rewriting the
 * shard does not drop it, and a shard whose JSON will not parse loses only its
 * own pages.
 *
 * @param directory - Side-table directory; a missing one reads as empty.
 * @returns The shards and the pages they hold.
 */
export function readAdjudicationTable(
  directory: string,
): AdjudicationTableContents {
  const shards = readShardDirectory(directory);
  const pages = new Map<string, AdjudicationPage>();
  for (const shard of shards.values())
    for (const [key, value] of Object.entries(shard.entries)) {
      const parsed = AdjudicationPageSchema.safeParse(value);
      if (parsed.success) pages.set(key, parsed.data);
    }
  return { shards, pages };
}
