import { FACTS_SCHEMA_VERSION } from '../../../../../constants/facts.js';
import {
  createDeclaredInputHasher,
  validateFactsRecord,
} from '../../../../../core/facts/index.js';
import type {
  FactsRejection,
  ParsedSubmission,
} from '../../../../../core/facts/index.js';

import type { FactsContext } from './buildFactsContext.js';
import { writeFactsShards } from './writeFactsShards.js';

/** What one submit call changed in the store. */
export interface StoreOutcome {
  accepted: number;
  removed: number;
  rejections: FactsRejection[];
  /** Paths whose shard another writer replaced mid-call. */
  conflicted: string[];
}

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
 * @param projectRoot - Absolute project root every path is judged against.
 * @param context - Scope, scanned paths, shards and epoch for this call.
 * @param parsed - Records that already matched the schema, with their pointers.
 * @returns Counts, every rejection, and the paths a concurrent writer took.
 */
export function storeAcceptedRecords(
  projectRoot: string,
  context: FactsContext,
  parsed: readonly ParsedSubmission[],
): StoreOutcome {
  const validation = {
    projectRoot,
    scannedPaths: context.scannedSet,
    inScope: context.scope.covers,
    hashDeclaredInput: createDeclaredInputHasher(projectRoot),
  };
  const rejections: FactsRejection[] = [];
  const upserts = new Map<string, { path: string; value: unknown }>();
  for (const submission of parsed) {
    const result = validateFactsRecord(
      validation,
      submission.facts,
      submission.pointer,
    );
    rejections.push(...result.rejections);
    if (result.accepted === null) continue;
    upserts.set(context.storePaths.pathDigest(result.accepted.path), {
      path: result.accepted.path,
      value: {
        schemaVersion: FACTS_SCHEMA_VERSION,
        resolutionEpoch: context.epoch.resolutionEpoch,
        rejectedClaims: result.rejections.length,
        facts: result.accepted,
      },
    });
  }
  const deletions = unreachableRecordKeys(context);
  const written = writeFactsShards(context, upserts, deletions);
  return {
    accepted: written.accepted,
    removed: written.removed,
    rejections,
    conflicted: written.conflicted,
  };
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
