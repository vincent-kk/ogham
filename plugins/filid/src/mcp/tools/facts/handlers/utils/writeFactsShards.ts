import { writeFactsShardFile } from '../../../../../core/facts/index.js';

import type { FactsContext } from './buildFactsContext.js';

/** How many records one batch of shard writes stored, dropped or lost. */
export interface ShardWriteOutcome {
  accepted: number;
  removed: number;
  /** Paths whose shard was replaced by another writer during this call. */
  conflicted: string[];
}

/**
 * Apply one batch of record upserts and deletions, one write per shard.
 *
 * Grouping is what makes the batch cheap and the compare-and-set honest: a
 * whole-repository submission touches every shard a few dozen times, and
 * rewriting a shard per record would both cost hundreds of extra writes and
 * make each one race the last. A shard whose token no longer matches is left
 * untouched, and every record that was to land in it is reported as conflicted.
 *
 * @param context - Store paths and the shards as this call read them.
 * @param upserts - Path digest to the record value and the path it describes.
 * @param deletions - Path digest to the path, for records to drop.
 * @returns What landed, what was dropped, and which paths lost their shard.
 */
export function writeFactsShards(
  context: FactsContext,
  upserts: ReadonlyMap<string, { path: string; value: unknown }>,
  deletions: ReadonlyMap<string, string>,
): ShardWriteOutcome {
  const byShard = new Map<string, { keys: string[]; paths: string[] }>();
  for (const [key, entry] of [...upserts, ...deletions].map(
    ([key, entry]): [string, string] => [
      key,
      typeof entry === 'string' ? entry : entry.path,
    ],
  )) {
    const shard = context.storePaths.shardFileName(key);
    const group = byShard.get(shard) ?? { keys: [], paths: [] };
    group.keys.push(key);
    group.paths.push(entry);
    byShard.set(shard, group);
  }
  const outcome: ShardWriteOutcome = { accepted: 0, removed: 0, conflicted: [] };
  for (const [shard, group] of byShard) {
    const existing = context.shards.get(shard);
    const entries = { ...(existing?.entries ?? {}) };
    for (const key of group.keys) {
      const upsert = upserts.get(key);
      if (upsert === undefined) delete entries[key];
      else entries[key] = upsert.value;
    }
    if (
      !writeFactsShardFile(
        context.storePaths.directory,
        shard,
        entries,
        existing?.digest ?? null,
      )
    ) {
      outcome.conflicted.push(...group.paths);
      continue;
    }
    for (const key of group.keys)
      if (upserts.has(key)) outcome.accepted += 1;
      else outcome.removed += 1;
  }
  return outcome;
}
