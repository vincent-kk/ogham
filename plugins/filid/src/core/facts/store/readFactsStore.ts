import { StoredFactsRecordSchema } from '../schema/storedFactsRecordSchema.js';
import type { StoredFactsRecord } from '../schema/storedFactsRecordSchema.js';

import { readShardDirectory } from './readShardDirectory.js';
import type { FactsShard } from './readShardDirectory.js';

/** Everything the store holds right now. */
export interface FactsStoreContents {
  /** Shard file name to shard, carrying the tokens a write needs. */
  shards: Map<string, FactsShard>;
  /** Path digest to record, for every entry that matched the schema. */
  records: Map<string, StoredFactsRecord>;
}

/**
 * Read every shard, and every record inside them that still matches the schema.
 *
 * Damage is contained at two levels. A single entry that does not match the
 * schema is left out of `records` — so its file reads as `missing` — while
 * staying in the shard's `entries`, which keeps the shard rewritable without
 * losing it. A shard whose JSON will not parse at all loses its whole entry set,
 * and every file it held reads as `missing`; the shard's own digest is still the
 * write token, so resubmitting those files repairs it (spec §2.4).
 *
 * @param directory - Facts store directory; a missing one reads as empty.
 * @returns The shards and the records they hold.
 */
export function readFactsStore(directory: string): FactsStoreContents {
  const shards = readShardDirectory(directory);
  const records = new Map<string, StoredFactsRecord>();
  for (const shard of shards.values())
    for (const [key, value] of Object.entries(shard.entries)) {
      const parsed = StoredFactsRecordSchema.safeParse(value);
      if (parsed.success) records.set(key, parsed.data);
    }
  return { shards, records };
}
