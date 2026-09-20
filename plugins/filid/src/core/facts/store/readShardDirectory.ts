import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  FACTS_RECORD_EXTENSION,
  FACTS_SHARD_NAME_LENGTH,
} from '../../../constants/facts.js';

/** Shard files are named by digest prefix, so nothing else in the directory matches. */
const SHARD_FILE_NAME = new RegExp(
  `^[0-9a-f]{${FACTS_SHARD_NAME_LENGTH}}\\${FACTS_RECORD_EXTENSION}$`,
);

/** One shard file as it currently sits on disk. */
export interface FactsShard {
  /** Digest of the file's bytes, the compare-and-set token for a replacement. */
  digest: string;
  /**
   * The shard's entries as raw JSON values, keyed by digest.
   *
   * Raw rather than validated so a rewrite preserves entries it does not touch,
   * including any that no longer match a schema. Empty when the file's JSON
   * could not be parsed at all.
   */
  entries: Record<string, unknown>;
}

/**
 * Read every shard file in one directory.
 *
 * Shared by the record store and the adjudication side table, which are two
 * directories with the same shape: keys are digests, values are documents, and
 * damage is contained per shard. Keeping one reader means a fix to how a
 * corrupt shard is handled cannot land on one of them and miss the other.
 *
 * @param directory - Shard directory; a missing one reads as empty.
 * @returns Shard file name to shard.
 */
export function readShardDirectory(
  directory: string,
): Map<string, FactsShard> {
  const shards = new Map<string, FactsShard>();
  let fileNames: string[];
  try {
    fileNames = readdirSync(directory).filter((name) =>
      SHARD_FILE_NAME.test(name),
    );
  } catch {
    return shards;
  }
  for (const fileName of fileNames) {
    let bytes: Buffer;
    try {
      bytes = readFileSync(join(directory, fileName));
    } catch {
      continue;
    }
    shards.set(fileName, {
      digest: createHash('sha256').update(bytes).digest('hex'),
      entries: parseEntries(bytes),
    });
  }
  return shards;
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
