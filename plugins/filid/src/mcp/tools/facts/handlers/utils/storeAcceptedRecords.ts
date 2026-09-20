import {
  FACTS_ADJUDICATION_STATES,
  FACTS_SCHEMA_VERSION,
  FACTS_TIERS,
} from '../../../../../constants/facts.js';
import {
  createDeclaredInputHasher,
  hashProjectFile,
  readAdjudicationTable,
  readPendingStore,
  splitSourceLines,
  validateFactsRecord,
  writeAdjudicationPages,
  writeShardPages,
} from '../../../../../core/facts/index.js';
import type {
  AdjudicationPage,
  AdjudicationPageUpdate,
  AdjudicationState,
  FactsRejection,
  ParsedSubmission,
  ShardPageUpdate,
} from '../../../../../core/facts/index.js';
import type { AttestedOutcome } from '../../types/factsToolTypes.js';

import { applyAttestation } from './applyAttestation.js';
import type { FactsContext } from './buildFactsContext.js';
import { planSideTableForSubmit } from './planSideTableForSubmit.js';
import type { AgreedNonReferences } from './planSideTableForSubmit.js';
import { writeFactsShards } from './writeFactsShards.js';

/** What one submit call changed in the store. */
export interface StoreOutcome {
  accepted: number;
  removed: number;
  rejections: FactsRejection[];
  /** Paths whose shard another writer replaced mid-call. */
  conflicted: string[];
  /** Paths whose side-table page another writer replaced mid-call. */
  sideTableConflicts: string[];
  /** Edges this batch walked back, now awaiting judgement. */
  openedItems: number;
  /** Side-table items this batch settled by carrying the edge. */
  closedItems: number;
  /** Judgements discarded with pages whose file left the tree or the scope. */
  removedAdjudicated: number;
  /** One entry per attested record, with what it did and what is owed next. */
  attested: AttestedOutcome[];
  /** Edges two attesters had already put down, recorded without a new ritual. */
  attestationDismissals: number;
  /** Paths whose pending page another writer replaced mid-call. */
  pendingConflicts: string[];
}

/** States an actor put an item into; a removed page loses these judgements. */
const JUDGED_STATES: readonly AdjudicationState[] = [
  FACTS_ADJUDICATION_STATES.PENDING_DISMISS,
  FACTS_ADJUDICATION_STATES.ADOPTED,
  FACTS_ADJUDICATION_STATES.DISMISSED,
];

/**
 * Check every parsed record and replace the store's view of its file.
 *
 * Replacement, never merge: one file has one record, and the last accepted
 * submission is it (spec §4.4). Records naming a file that is no longer scanned,
 * or that the declared scope no longer covers, are dropped in the same call —
 * no rule may read them, and leaving them would keep dead entries in the store.
 *
 * Upserts and deletions are collected first and written afterwards, so a shard
 * holding several of this batch's records is rewritten once rather than once per
 * record.
 *
 * Each replacement also reconciles its file's side table: an edge the new record
 * walked back becomes an item to judge, and one it carries after all closes the
 * item that was waiting on it (spec §2.4).
 *
 * Every count returned is counted over pages that actually landed. A page whose
 * shard another writer took holds none of what this call planned for it, so
 * reporting the plan would state a number the disk does not have.
 *
 * An attested record takes a longer road. It passes the same checks, then has
 * to account for every line that looks like a reference and be confirmed by a
 * different actor before it is stored at all (spec §4.6); until then it lives in
 * the pending store, which is why a submission can accept a record here and
 * store nothing. A `tool` record landing on a file discards that file's pending
 * attestation: the tool read the bytes, so reviving an unread claim later could
 * only overwrite what it found.
 *
 * @param projectRoot - Absolute project root every path is judged against.
 * @param context - Scope, scanned paths, shards and epoch for this call.
 * @param parsed - Records that already matched the schema, with their pointers.
 * @param actor - Self-declared actor of this call; attested records need one.
 * @returns Counts, every rejection, and the paths a concurrent writer took.
 */
export function storeAcceptedRecords(
  projectRoot: string,
  context: FactsContext,
  parsed: readonly ParsedSubmission[],
  actor: string,
): StoreOutcome {
  const validation = {
    projectRoot,
    scannedPaths: context.scannedSet,
    inScope: context.scope.covers,
    hashDeclaredInput: createDeclaredInputHasher(projectRoot),
  };
  const rejections: FactsRejection[] = [];
  const upserts = new Map<string, { path: string; value: unknown }>();
  const table = readAdjudicationTable(context.storePaths.sideTableDirectory);
  const store = readPendingStore(context.storePaths.pendingDirectory);
  const pendingUpdates = new Map<string, ShardPageUpdate>();
  const attested: AttestedOutcome[] = [];
  const pageUpdates = new Map<string, AdjudicationPageUpdate>();
  const planned = new Map<
    string,
    { opened: number; closed: number; dismissed: number }
  >();
  for (const submission of parsed) {
    const result = validateFactsRecord(
      validation,
      submission.facts,
      submission.pointer,
    );
    rejections.push(...result.rejections);
    if (result.accepted === null) continue;
    const held = context.records.get(result.accepted.path)?.record;
    const current = hashProjectFile(projectRoot, result.accepted.path);
    const key = context.storePaths.pathDigest(result.accepted.path);
    let agreed: AgreedNonReferences | undefined;
    if (result.accepted.provenance.tier === FACTS_TIERS.ATTESTED) {
      if (!current.ok) continue;
      const effect = applyAttestation({
        facts: result.accepted,
        pending: store.pages.get(key),
        lines: splitSourceLines(current.contents.toString('utf8')),
        actor,
        pointer: submission.pointer,
      });
      if (effect.rejection !== null) rejections.push(effect.rejection);
      if (effect.outcome !== null) attested.push(effect.outcome);
      agreed = effect.agreed ?? undefined;
      if (effect.pendingChange !== 'keep')
        pendingUpdates.set(key, {
          path: result.accepted.path,
          document: effect.page as unknown as Record<string, unknown> | null,
        });
      if (!effect.store) continue;
    } else if (store.pages.has(key))
      pendingUpdates.set(key, { path: result.accepted.path, document: null });
    if (current.ok) {
      const plan = planSideTableForSubmit(
        table,
        key,
        held?.facts ?? null,
        result.accepted,
        current,
        held?.resolutionEpoch === context.epoch.resolutionEpoch,
        agreed,
      );
      pageUpdates.set(key, { path: plan.path, items: plan.items });
      planned.set(key, {
        opened: plan.opened,
        closed: plan.closedByRecord,
        dismissed: plan.dismissedByAttesters,
      });
    }
    upserts.set(context.storePaths.pathDigest(result.accepted.path), {
      path: result.accepted.path,
      value: {
        schemaVersion: FACTS_SCHEMA_VERSION,
        resolutionEpoch: context.epoch.resolutionEpoch,
        rejectedClaims: result.rejections.map((rejection) => ({
          code: rejection.code,
          ...(rejection.specifier === undefined
            ? {}
            : { specifier: rejection.specifier }),
          ...(rejection.inputPath === undefined
            ? {}
            : { inputPath: rejection.inputPath }),
          ...(rejection.lines === undefined ? {} : { lines: rejection.lines }),
        })),
        facts: result.accepted,
      },
    });
  }
  const deletions = unreachableRecordKeys(context);
  const unreachable = unreachablePages(context, table);
  for (const [key, page] of unreachable)
    pageUpdates.set(key, { path: page.path, items: [] });
  const pagesWritten = writeAdjudicationPages(
    context.storePaths.sideTableDirectory,
    table,
    pageUpdates,
    context.storePaths.shardFileName,
  );
  const pendingWritten = writeShardPages(
    context.storePaths.pendingDirectory,
    store.shards,
    pendingUpdates,
    context.storePaths.shardFileName,
  );
  const written = writeFactsShards(context, upserts, deletions);
  let openedItems = 0;
  let closedItems = 0;
  let attestationDismissals = 0;
  for (const [key, plan] of planned)
    if (pagesWritten.stored.has(key)) {
      openedItems += plan.opened;
      closedItems += plan.closed;
      attestationDismissals += plan.dismissed;
    }
  let removedAdjudicated = 0;
  for (const [key, page] of unreachable)
    if (pagesWritten.stored.has(key))
      removedAdjudicated += page.items.filter((item) =>
        JUDGED_STATES.includes(item.state),
      ).length;
  return {
    accepted: written.accepted,
    removed: written.removed,
    rejections,
    conflicted: written.conflicted,
    sideTableConflicts: pagesWritten.conflicted,
    openedItems,
    closedItems,
    removedAdjudicated,
    attested,
    attestationDismissals,
    pendingConflicts: pendingWritten.conflicted,
  };
}

/**
 * Side-table pages whose file left the tree or the declared scope.
 *
 * Without this an item outlives its file: status keeps naming it as work, and
 * `adjudicate` sends the caller to `compare` for a contentHash that `compare`
 * will never produce, because it skips files it cannot read. That is a loop the
 * agent cannot leave (P5), so the page goes when the file does.
 *
 * @param context Scope, scanned paths and store contents for this call.
 * @param table The side table as this call read it.
 * @returns Path digests to clear, mapped to the page each held.
 */
function unreachablePages(
  context: FactsContext,
  table: Parameters<typeof writeAdjudicationPages>[1],
): Map<string, AdjudicationPage> {
  const keys = new Map<string, AdjudicationPage>();
  for (const [key, page] of table.pages)
    if (!context.scannedSet.has(page.path) || !context.scope.covers(page.path))
      keys.set(key, page);
  return keys;
}

/**
 * Record keys whose file left the tree or the declared scope.
 * @param context Scope, scanned paths and store contents for this call.
 * @returns Path digests to delete, mapped to the path each described.
 */
function unreachableRecordKeys(context: FactsContext): Map<string, string> {
  const keys = new Map<string, string>();
  for (const [path, entry] of context.records)
    if (!context.scannedSet.has(path) || !context.scope.covers(path))
      keys.set(entry.pathDigest, path);
  return keys;
}
