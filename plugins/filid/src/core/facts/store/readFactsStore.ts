import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  FACTS_RECORD_EXTENSION,
  FACTS_SHARD_NAME_LENGTH,
} from '../../../constants/facts.js';
import { StoredFactsRecordSchema } from '../schema/storedFactsRecordSchema.js';
import type { StoredFactsRecord } from '../schema/storedFactsRecordSchema.js';

/** Shard files are named by digest prefix, so nothing else in the directory matches. */
const SHARD_FILE_NAME = new RegExp(
  `^[0-9a-f]{${FACTS_SHARD_NAME_LENGTH}}\\${FACTS_RECORD_EXTENSION}$`,
);

/** One shard file as it currently sits on disk. */
export interface FactsShard {
  /** Digest of the file's bytes, the compare-and-set token for a replacement. */
  digest: string;
  /**
   * The shard's records as raw JSON values, keyed by path digest.
   *
   * Raw rather than validated so a rewrite preserves entries it does not touch,
   * including any that no longer match the schema. Empty when the file's JSON
   * could not be parsed at all.
   */
  entries: Record<string, unknown>;
}

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
 * staying in `entries`, which keeps its shard rewritable without losing it. A
 * shard whose JSON will not parse at all loses its whole entry set, and every
 * file it held reads as `missing`; the shard's own digest is still the write
 * token, so resubmitting those files repairs it (spec §2.4).
 *
 * @param directory - Facts store directory; a missing one reads as empty.
 * @returns The shards and the records they hold.
 */
export function readFactsStore(directory: string): FactsStoreContents {
  const shards = new Map<string, FactsShard>();
  const records = new Map<string, StoredFactsRecord>();
  let fileNames: string[];
  try {
    fileNames = readdirSync(directory).filter((name) =>
      SHARD_FILE_NAME.test(name),
    );
  } catch {
    return { shards, records };
  }
  for (const fileName of fileNames) {
    let bytes: Buffer;
    try {
      bytes = readFileSync(join(directory, fileName));
    } catch {
      continue;
    }
    const entries = parseEntries(bytes);
    shards.set(fileName, {
      digest: createHash('sha256').update(bytes).digest('hex'),
      entries,
    });
    for (const [key, value] of Object.entries(entries)) {
      const parsed = StoredFactsRecordSchema.safeParse(value);
      if (parsed.success) records.set(key, parsed.data);
    }
  }
  return { shards, records };
}

/**
 * Parse shard bytes into a plain key-value object, without the parser's message.
 * @param bytes Raw shard file contents.
 * @returns The shard's entries, or an empty set when the bytes are unusable.
 */
function parseEntries(bytes: Buffer): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(bytes.toString('utf8'));
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
      return {};
    return { ...(parsed as Record<string, unknown>) };
  } catch {
    return {};
  }
}
