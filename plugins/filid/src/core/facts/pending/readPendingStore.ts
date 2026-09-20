import { readShardDirectory } from '../store/readShardDirectory.js';
import type {
  FactsShard,
  ShardDamage,
} from '../store/readShardDirectory.js';

import { PendingAttestationSchema } from './pendingPageSchema.js';
import type { PendingAttestation } from './pendingPageSchema.js';

/** The pending attestation store as it currently sits on disk. */
export interface PendingStoreContents {
  /** Shard file name to shard, carrying the compare-and-set tokens. */
  shards: Map<string, FactsShard>;
  /** Path digest to that file's pending attestation, for every valid page. */
  pages: Map<string, PendingAttestation>;
  /** Shard file name to why it could not be read as its entries. */
  damaged: Map<string, ShardDamage>;
  /** Whether the directory itself could not be listed. */
  directoryUnreadable: boolean;
}

/**
 * Read every pending attestation the store holds.
 *
 * Same containment as the record store and the side table: a page that no
 * longer matches the schema is left out while staying in its shard's raw
 * entries, so rewriting the shard does not drop it, and a shard whose JSON will
 * not parse loses only its own pages. A lost pending attestation costs one
 * repeated first submission, never a stored record.
 *
 * @param directory - Pending directory; a missing one reads as empty.
 * @returns The shards and the pages they hold.
 */
export function readPendingStore(directory: string): PendingStoreContents {
  const { shards, damaged, directoryUnreadable } =
    readShardDirectory(directory);
  const pages = new Map<string, PendingAttestation>();
  for (const shard of shards.values())
    for (const [key, value] of Object.entries(shard.entries)) {
      const parsed = PendingAttestationSchema.safeParse(value);
      if (parsed.success) pages.set(key, parsed.data);
    }
  return { shards, pages, damaged, directoryUnreadable };
}
