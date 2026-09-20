import type { FilidConfig } from '../../infra/configLoader/index.js';
import {
  listScannedFilePaths,
  scanFileSetOptions,
} from '../../tree/fractalTree/index.js';
import { collectDefaultResolutionInputs } from '../epoch/collectDefaultResolutionInputs.js';
import { computeResolutionEpoch } from '../epoch/computeResolutionEpoch.js';
import type { ResolutionEpochSnapshot } from '../epoch/computeResolutionEpoch.js';
import { readPendingStore } from '../pending/readPendingStore.js';
import type { PendingAttestation } from '../pending/pendingPageSchema.js';
import type { StoredFactsRecord } from '../schema/storedFactsRecordSchema.js';
import { readAdjudicationTable } from '../sideTable/readAdjudicationTable.js';
import type { AdjudicationPage } from '../sideTable/adjudicationTableSchema.js';
import { resolveFactsScope } from '../scope/resolveFactsScope.js';
import type { FactsScope } from '../scope/resolveFactsScope.js';
import { resolveFactsStorePaths } from '../store/factsStorePaths.js';
import type { FactsStorePaths } from '../store/factsStorePaths.js';
import { readFactsStore } from '../store/readFactsStore.js';
import type {
  FactsShard,
  ShardDamage,
} from '../store/readShardDirectory.js';

/** One stored record together with the key it is filed under. */
export interface FactsRecordEntry {
  pathDigest: string;
  record: StoredFactsRecord;
}

/** What the store knows about one project, read against the tree as it stands. */
export interface ProjectFacts {
  /** Which files the project declares, or the adapters' default scope. */
  scope: FactsScope;
  /** Every path the scan reports, in raw-byte order. */
  scannedPaths: string[];
  /** The same paths as a set, for membership questions. */
  scannedSet: Set<string>;
  /** Where this project's facts state lives. */
  storePaths: FactsStorePaths;
  /** Readable records keyed by the project-relative path each describes. */
  records: Map<string, FactsRecordEntry>;
  /** Shard file name to shard, carrying the compare-and-set tokens. */
  shards: Map<string, FactsShard>;
  /** The project's resolution epoch right now. */
  epoch: ResolutionEpochSnapshot;
  /**
   * Adjudication pages keyed by the project-relative path each belongs to.
   *
   * Part of the same read because a file's state depends on them: an item
   * nobody has settled makes the file `uncertain`, and an adopted one adds an
   * edge the record does not carry. Reading them separately would let the two
   * answers be assembled from different moments.
   */
  adjudications: Map<string, AdjudicationPage>;
  /**
   * Judgement shards the store could not read, by shard file name.
   *
   * The side table and the pending store share the numbering, so one map
   * answers for both. An empty map with `judgementsDirectoryUnreadable` false
   * is the only reading that means "nothing is hidden".
   */
  damagedJudgementShards: Map<string, ShardDamage>;
  /** Whether a judgement directory itself could not be listed. */
  judgementsDirectoryUnreadable: boolean;
  /** Unconfirmed attested submissions, keyed the same way. */
  pending: Map<string, PendingAttestation>;
}

/**
 * Read what the store holds for one project, against the tree as it now stands.
 *
 * One function for both readers. Analysis reads facts to draw conclusions and
 * the facts tool reads them to report state; if each assembled its own view,
 * the two would eventually disagree about which files are in scope or which
 * epoch is current, and a disagreement there is a disagreement about what the
 * project's dependencies ARE.
 *
 * Read-only on purpose. Persisting the epoch snapshot belongs to the tool that
 * counts drift across submissions — an analysis pass must not move state that
 * a later refusal is judged against.
 *
 * The config is a parameter rather than something loaded here: the snapshot
 * already holds one, and loading it twice inside a single call is two answers
 * to the same question.
 *
 * @param projectRoot - Absolute project root, used as given.
 * @param config - Loaded configuration, or undefined when none was readable.
 * @returns Scope, scanned paths, store contents and the current epoch.
 */
export async function readProjectFacts(
  projectRoot: string,
  config?: FilidConfig,
): Promise<ProjectFacts> {
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
  const table = readAdjudicationTable(storePaths.sideTableDirectory);
  const adjudications = new Map<string, AdjudicationPage>();
  for (const page of table.pages.values()) adjudications.set(page.path, page);
  const pendingStore = readPendingStore(storePaths.pendingDirectory);
  const pending = new Map<string, PendingAttestation>();
  for (const page of pendingStore.pages.values()) pending.set(page.path, page);
  return {
    scope,
    scannedPaths,
    scannedSet: new Set(scannedPaths),
    storePaths,
    records,
    shards: store.shards,
    adjudications,
    damagedJudgementShards: new Map([
      ...table.damaged,
      ...pendingStore.damaged,
    ]),
    judgementsDirectoryUnreadable:
      table.directoryUnreadable || pendingStore.directoryUnreadable,
    pending,
    epoch: computeResolutionEpoch(
      projectRoot,
      scannedPaths,
      collectDefaultResolutionInputs(scannedPaths),
    ),
  };
}
