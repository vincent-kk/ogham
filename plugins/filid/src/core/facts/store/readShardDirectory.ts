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

/** Why a shard could not be read as the set of entries it holds. */
export type ShardDamage = 'unreadable' | 'unparseable';

/** A shard directory as it currently sits on disk, damage included. */
export interface ShardDirectoryContents {
  /** Shard file name to shard, for every shard whose bytes could be read. */
  shards: Map<string, FactsShard>;
  /**
   * Shard file name to why it does not read as its entries.
   *
   * Absent from this map means the shard read cleanly; a shard that is not on
   * disk at all appears in neither map, because never written and unreadable
   * are different facts and only the first one means "empty".
   */
  damaged: Map<string, ShardDamage>;
  /**
   * Whether the directory itself could not be listed.
   *
   * Then nothing is known about any shard, not even its name, so every file
   * the directory could have held is affected.
   */
  directoryUnreadable: boolean;
}

/** One shard file as it currently sits on disk. */
export interface FactsShard {
  /** Digest of the file's bytes, the compare-and-set token for a replacement. */
  digest: string;
  /**
   * The shard's entries as raw JSON values, keyed by digest.
   *
   * Raw rather than validated so a rewrite preserves entries it does not touch,
   * including any that no longer match a schema. Empty when the file's JSON
   * could not be parsed at all, which `damaged` reports separately.
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
 * Damage is reported, never swallowed: a caller that cannot tell "this shard
 * holds nothing" from "this shard could not be read" concludes from an absence
 * it never established.
 *
 * @param directory - Shard directory; a missing one reads as empty.
 * @returns The shards, the damaged shard names, and whether the directory
 * itself could not be listed.
 */
export function readShardDirectory(
  directory: string,
): ShardDirectoryContents {
  const shards = new Map<string, FactsShard>();
  const damaged = new Map<string, ShardDamage>();
  let fileNames: string[];
  try {
    fileNames = readdirSync(directory).filter((name) =>
      SHARD_FILE_NAME.test(name),
    );
  } catch (error) {
    return {
      shards,
      damaged,
      directoryUnreadable: !isMissingPath(error),
    };
  }
  for (const fileName of fileNames) {
    let bytes: Buffer;
    try {
      bytes = readFileSync(join(directory, fileName));
    } catch {
      damaged.set(fileName, 'unreadable');
      continue;
    }
    const entries = parseEntries(bytes);
    if (entries === null) damaged.set(fileName, 'unparseable');
    shards.set(fileName, {
      digest: createHash('sha256').update(bytes).digest('hex'),
      entries: entries ?? {},
    });
  }
  return { shards, damaged, directoryUnreadable: false };
}

/**
 * Whether a filesystem error means the path is simply not there.
 * @param error Whatever the failed call threw.
 * @returns True for ENOENT and ENOTDIR, which are absence rather than damage.
 */
function isMissingPath(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === 'ENOENT' || code === 'ENOTDIR';
}

/**
 * Parse shard bytes into a plain key-value object, without the parser's message.
 * @param bytes Raw shard file contents.
 * @returns The shard's entries, or null when the bytes are not a JSON object.
 */
function parseEntries(bytes: Buffer): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(bytes.toString('utf8'));
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
      return null;
    return { ...(parsed as Record<string, unknown>) };
  } catch {
    return null;
  }
}
