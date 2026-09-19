import {
  collectDefaultResolutionInputs,
  computeResolutionEpoch,
  readEpochSnapshot,
  readFactsStore,
  resolveFactsScope,
  resolveFactsStorePaths,
  writeEpochSnapshot,
} from '../../../../../core/facts/index.js';
import type {
  FactsScope,
  FactsShard,
  FactsStorePaths,
  ResolutionEpochSnapshot,
  StoredFactsRecord,
} from '../../../../../core/facts/index.js';
import { loadConfig } from '../../../../../core/infra/configLoader/index.js';
import {
  listScannedFilePaths,
  scanFileSetOptions,
} from '../../../../../core/tree/fractalTree/index.js';

/** One stored record together with the key it is filed under. */
export interface FactsRecordEntry {
  pathDigest: string;
  record: StoredFactsRecord;
}

/** Everything both facts actions derive from the project before they diverge. */
export interface FactsContext {
  scope: FactsScope;
  scannedPaths: string[];
  scannedSet: Set<string>;
  storePaths: FactsStorePaths;
  /** Readable records keyed by the project-relative path each describes. */
  records: Map<string, FactsRecordEntry>;
  /** Shard file name to shard, carrying the compare-and-set tokens. */
  shards: Map<string, FactsShard>;
  epoch: ResolutionEpochSnapshot;
  /**
   * The epoch filid last recorded, read before this call overwrote it.
   *
   * Null when none was readable, which makes the epoch difference lists empty
   * rather than guessed.
   */
  previousEpoch: ResolutionEpochSnapshot | null;
}

/**
 * Read the project state both facts actions start from.
 *
 * The scan runs with the options the project snapshot uses, not the built-in
 * defaults, so the facts scope and the analysed tree are the same set of files.
 *
 * The epoch depends on the project alone, never on what is stored — folding
 * record-declared inputs into it would let accepting a batch move the epoch the
 * next batch is submitted against. The snapshot is persisted here, on every
 * call, so that a caller which reads an epoch now and submits after the tree
 * moves can be told which paths moved instead of only that the epoch differs.
 *
 * @param projectRoot - Absolute project root, used as given.
 * @returns Scope, scanned paths, store contents and the current epoch.
 */
export async function buildFactsContext(
  projectRoot: string,
): Promise<FactsContext> {
  const config = loadConfig(projectRoot).config ?? undefined;
  const scope = resolveFactsScope(config);
  const scannedPaths = await listScannedFilePaths(
    projectRoot,
    scanFileSetOptions(config),
  );
  const storePaths = resolveFactsStorePaths(projectRoot);
  const store = readFactsStore(storePaths.directory);
  const records = new Map<string, FactsRecordEntry>();
  for (const [pathDigest, record] of store.records)
    records.set(record.facts.path, { pathDigest, record });
  const epoch = computeResolutionEpoch(
    projectRoot,
    scannedPaths,
    collectDefaultResolutionInputs(scannedPaths),
  );
  const previousEpoch = readEpochSnapshot(storePaths.epochSnapshotPath);
  writeEpochSnapshot(storePaths.epochSnapshotPath, epoch);
  return {
    previousEpoch,
    scope,
    scannedPaths,
    scannedSet: new Set(scannedPaths),
    storePaths,
    records,
    shards: store.shards,
    epoch,
  };
}
