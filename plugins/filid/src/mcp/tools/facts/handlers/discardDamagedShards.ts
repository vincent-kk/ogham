import { ANALYSIS_AXES } from '../../../../constants/analysisAxes.js';
import {
  FACTS_DAMAGED_DISCARDED_NEXT_ACTION,
  FACTS_PENDING_DISCARDED_CODE,
  FACTS_PENDING_DISCARDED_NEXT_ACTION,
  FACTS_SHARD_NOT_DAMAGED_CODE,
  FACTS_SHARD_NOT_DAMAGED_NEXT_ACTION,
  FACTS_UNKNOWN_CAUSES,
} from '../../../../constants/facts.js';
import { TOOL_STATUSES } from '../../../../constants/toolEnvelope.js';
import {
  readAdjudicationTable,
  readPendingStore,
  writeFactsShardFile,
} from '../../../../core/facts/index.js';
import type { ToolPayload } from '../../../../types/toolEnvelope.js';
import type {
  DiscardDamagedInput,
  FactsDiscardDamagedData,
  FactsDiscardDamagedSummary,
} from '../types/factsToolTypes.js';

import { awaitingComparisonEntries } from './utils/awaitingComparisonEntries.js';
import { buildFactsContext } from './utils/buildFactsContext.js';

/**
 * Drop a judgement shard whose JSON the store cannot read (spec §3).
 *
 * The one way out of a damaged side-table or pending shard. Every other write
 * to those stores happens where a disagreement is detected, and the
 * disagreements a damaged shard holds are exactly the ones nobody can read —
 * so an ordinary submit never touches it and the files it covers stay
 * `uncertain` forever. Without this call the refusal would have no next action
 * that changes state, which is the situation the whole state model exists to
 * remove (P5).
 *
 * Only a shard the store currently reports as damaged is accepted. A readable
 * shard is refused by name, so this is not a way to delete judgements somebody
 * would rather not answer.
 *
 * It replaces the shard rather than unlinking it: the file stays where the
 * store expects it, and the write carries the damaged shard's own digest, so a
 * concurrent writer that replaced it in the meantime wins instead of losing
 * its work.
 *
 * A side-table shard is replaced with one marked, itemless page per scanned
 * in-scope file it could have held, not with nothing. Discarding removes what
 * the shard held — an adopted edge no record carries included — so settling
 * those files the moment the damage stops being visible would let a caller that
 * skipped the next action conclude over that absence. The mark holds them
 * `uncertain` until a comparison from another provenance re-derives it. A
 * pending shard gets no mark: an unconfirmed attestation was never agreed, so
 * losing it removes no edge, and `discard-pending` already clears those.
 *
 * @param input - Project root and the shard file names to drop.
 * @returns What was dropped, what was refused, and what to do next.
 */
export async function discardDamagedShards(
  input: DiscardDamagedInput,
): Promise<ToolPayload<FactsDiscardDamagedSummary, FactsDiscardDamagedData>> {
  const context = await buildFactsContext(input.path);
  const storePaths = context.storePaths;
  const covered = context.scannedPaths.filter((path) =>
    context.scope.covers(path),
  );
  const stores = [
    {
      directory: storePaths.sideTableDirectory,
      contents: readAdjudicationTable(storePaths.sideTableDirectory),
      marks: true,
    },
    {
      directory: storePaths.pendingDirectory,
      contents: readPendingStore(storePaths.pendingDirectory),
      marks: false,
    },
  ];
  const discarded: string[] = [];
  const refused: string[] = [];
  const marked: string[] = [];
  let affectedFiles = 0;
  for (const shard of [...new Set(input.shards)].sort()) {
    const store = stores.find(
      ({ contents }) => contents.damaged.get(shard) === 'unparseable',
    );
    const existing = store?.contents.shards.get(shard);
    if (!store || existing === undefined) {
      refused.push(shard);
      continue;
    }
    const affected = store.marks
      ? awaitingComparisonEntries(covered, storePaths, shard)
      : {};
    if (
      writeFactsShardFile(
        store.directory,
        shard,
        affected,
        existing.digest,
      ) === null
    ) {
      refused.push(shard);
      continue;
    }
    discarded.push(shard);
    if (!store.marks) continue;
    marked.push(shard);
    affectedFiles += Object.keys(affected).length;
  }
  return {
    projectRoot: input.path,
    status: refused.length > 0 ? TOOL_STATUSES.INDETERMINATE : TOOL_STATUSES.OK,
    summary: {
      discarded: discarded.length,
      refused: refused.length,
      affectedFiles,
    },
    data: { discarded, refused },
    diagnostics: [
      ...(marked.length === 0
        ? []
        : [
            {
              code: FACTS_UNKNOWN_CAUSES.JUDGEMENTS_DISCARDED,
              message: `Dropped ${marked.length} damaged side-table shard(s) covering ${affectedFiles} scanned file(s): ${marked.join(', ')}. Those files stay uncertain until a comparison from another provenance re-derives what was lost.`,
              path: input.path,
              affects: ANALYSIS_AXES,
              nextAction: FACTS_DAMAGED_DISCARDED_NEXT_ACTION,
            },
          ]),
      ...(discarded.length === marked.length
        ? []
        : [
            {
              code: FACTS_PENDING_DISCARDED_CODE,
              message: `Dropped ${discarded.length - marked.length} damaged pending shard(s): ${discarded.filter((shard) => !marked.includes(shard)).join(', ')}. They carried attested submissions nobody had confirmed, so no edge was lost and no file is held by this discard.`,
              path: input.path,
              affects: ANALYSIS_AXES,
              nextAction: FACTS_PENDING_DISCARDED_NEXT_ACTION,
            },
          ]),
      ...(refused.length > 0
        ? [
            {
              code: FACTS_SHARD_NOT_DAMAGED_CODE,
              message: `Nothing was dropped for ${refused.join(', ')}: the store reads ${refused.length === 1 ? 'it' : 'them'}, or another writer replaced ${refused.length === 1 ? 'it' : 'them'} first.`,
              path: input.path,
              affects: ANALYSIS_AXES,
              nextAction: FACTS_SHARD_NOT_DAMAGED_NEXT_ACTION,
            },
          ]
        : []),
    ],
  };
}
