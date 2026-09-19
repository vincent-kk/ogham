import { createHash } from 'node:crypto';
import { join } from 'node:path';

import {
  FACTS_EPOCH_DRIFT_FILE,
  FACTS_RECORD_EXTENSION,
  FACTS_SHARD_NAME_LENGTH,
  FACTS_STORE_DIRECTORY,
} from '../../../constants/facts.js';
import { getCacheDir } from '../../infra/cacheManager/index.js';

/** Where one project's facts state lives, outside the project tree. */
export interface FactsStorePaths {
  /** Directory holding the shard files. */
  directory: string;
  /** File holding the last computed epoch and the inputs behind it. */
  epochSnapshotPath: string;
  /** File holding the consecutive-epoch counter. */
  driftPath: string;
  /**
   * Record key for one project-relative path.
   * @param relativePath Path as `listScannedFilePaths` spells it.
   * @returns The path's digest, which keys the record inside its shard.
   */
  pathDigest: (relativePath: string) => string;
  /**
   * Shard file holding one record.
   * @param pathDigest Digest returned by `pathDigest`.
   * @returns The shard file name.
   */
  shardFileName: (pathDigest: string) => string;
}

/**
 * Resolve where a project's facts records are stored.
 *
 * Records are keyed by the digest of the project-relative path rather than by
 * the path itself: a path contains separators and can exceed a filesystem's
 * name limit, and deriving a name from caller-influenced text is the path-
 * manipulation surface this store must not have.
 *
 * Records are grouped into shards named by the digest's first bytes, so a store
 * of a few thousand records costs a couple of hundred file opens rather than
 * one per record — per-file opens dominated reading the store when every record
 * had its own file.
 *
 * @param projectRoot - Absolute project root the store is keyed by.
 * @returns Absolute paths and the key functions for that project.
 */
export function resolveFactsStorePaths(projectRoot: string): FactsStorePaths {
  const directory = join(getCacheDir(projectRoot), FACTS_STORE_DIRECTORY);
  return {
    directory,
    epochSnapshotPath: join(directory, `epoch${FACTS_RECORD_EXTENSION}`),
    driftPath: join(directory, FACTS_EPOCH_DRIFT_FILE),
    pathDigest: (relativePath) =>
      createHash('sha256').update(relativePath, 'utf8').digest('hex'),
    shardFileName: (pathDigest) =>
      `${pathDigest.slice(0, FACTS_SHARD_NAME_LENGTH)}${FACTS_RECORD_EXTENSION}`,
  };
}
