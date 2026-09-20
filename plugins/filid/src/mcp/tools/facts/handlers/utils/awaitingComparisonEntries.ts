import { FACTS_SCHEMA_VERSION } from '../../../../../constants/facts.js';
import type { FactsStorePaths } from '../../../../../core/facts/index.js';

/**
 * The pages a discarded side-table shard is refilled with.
 *
 * Emptying the shard would settle every file it covered the moment the damage
 * stopped being visible, and an edge an adopted item carried would be gone with
 * nothing left to say so. Instead the shard is replaced — one atomic write, the
 * damaged shard's own digest as the token — with a page per file it could have
 * held, carrying the mark and no items. Which files those are is decided rather
 * than guessed: a shard's name is the leading digits of the path digest, so the
 * scanned paths in scope answer it exactly, and that count is the size bound.
 *
 * @param paths - Scanned project-relative paths the declared scope covers.
 * @param storePaths - The key functions this project's store is filed under.
 * @param shard - Shard file name being replaced.
 * @returns Entries keyed by path digest, ready for `writeFactsShardFile`;
 * empty when no scanned in-scope file maps to this shard.
 */
export function awaitingComparisonEntries(
  paths: readonly string[],
  storePaths: FactsStorePaths,
  shard: string,
): Record<string, unknown> {
  const entries: Record<string, unknown> = {};
  for (const path of paths) {
    const key = storePaths.pathDigest(path);
    if (storePaths.shardFileName(key) !== shard) continue;
    entries[key] = {
      schemaVersion: FACTS_SCHEMA_VERSION,
      path,
      items: [],
      awaitingComparison: true,
    };
  }
  return entries;
}
