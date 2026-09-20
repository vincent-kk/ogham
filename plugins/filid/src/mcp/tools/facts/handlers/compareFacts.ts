import { ANALYSIS_AXES } from '../../../../constants/analysisAxes.js';
import {
  FACTS_ACTIONS,
  FACTS_COMPARISON_AGAINST_STORE_NEXT_ACTION,
  FACTS_COMPARISON_NOT_AGAINST_STORE_CODE,
  FACTS_COMPARISON_NOT_INDEPENDENT_CODE,
  FACTS_JUDGEMENTS_DISCARDED_NEXT_ACTION,
  FACTS_TIERS,
} from '../../../../constants/facts.js';
import { TOOL_STATUSES } from '../../../../constants/toolEnvelope.js';
import {
  compareReferences,
  hashProjectFile,
  isOpenAdjudication,
  parseSubmittedRecords,
  readAdjudicationTable,
  writeAdjudicationPages,
} from '../../../../core/facts/index.js';
import type {
  AdjudicationPageUpdate,
  ComparableReference,
} from '../../../../core/facts/index.js';
import type { NormalizedFileFacts } from '../../../../types/fractal.js';
import type { ToolPayload } from '../../../../types/toolEnvelope.js';
import { readGenerationFrozenFacts } from '../../reviewState/index.js';
import type {
  CompareInput,
  FactsCompareData,
  FactsCompareSummary,
} from '../types/factsToolTypes.js';

import { buildFactsContext } from './utils/buildFactsContext.js';
import { capComparisonLists } from './utils/capComparisonLists.js';
import { capFileList } from './utils/capFileList.js';
import { buildSideTableConflictDiagnostics } from './utils/buildSideTableConflictDiagnostics.js';
import { buildUninitializedComparePayload } from './utils/buildUninitializedComparePayload.js';
import { buildInvalidGenerationPayload } from './utils/buildInvalidGenerationPayload.js';
import { buildUnfrozenGenerationPayload } from './utils/buildUnfrozenGenerationPayload.js';
import { collectFileComparison } from './utils/collectFileComparison.js';
import { describeAdjudicationItems } from './utils/describeAdjudicationItems.js';
import { openSubmission } from './utils/openSubmission.js';
import { planSideTableForCompare } from './utils/planSideTableForCompare.js';
import { storedComparableReferences } from './utils/storedComparableReferences.js';
import { toComparableReferences } from './utils/toComparableReferences.js';

/** A generation id as `publishReviewGeneration` mints it. */
const GENERATION_ID = /^[a-f0-9]{32}$/;

/**
 * Compare an independently extracted candidate against what the store holds.
 *
 * Nothing the candidate says is stored as a record — that is what makes this an
 * independent check rather than a second submission. What it does leave behind
 * is the disagreement: an edge somebody reported that the store does not carry
 * goes onto the side table, so a narrowed graph cannot pass unnoticed just
 * because no one happened to run `compare` again (spec §4.5).
 *
 * Only in-project resolutions can become items. Everything else is reported and
 * forgotten, so a tool that over-reports externals cannot flood the table or
 * make files `uncertain`.
 *
 * What comes back is the whole page for each compared file, not the differences
 * this run derived. A comparison that reported only its own findings would hide
 * every item some earlier submission opened, and an item nobody can see is an
 * item nobody can judge.
 *
 * It is also the one call that can clear a file's awaiting-comparison mark, and
 * only when it re-derives something: the candidate must come from a provenance
 * the stored record did not, and the baseline must be the store rather than a
 * generation's frozen facts. Either way the comparison itself still stands —
 * what a refused clearing withholds is the mark, not the findings.
 *
 * @param input - Project root, the candidate file and an optional generation.
 * @returns The five comparison buckets and how many items the table now holds.
 * @throws {ToolDiagnosticError} A `facts-file-*` code when the candidate file
 * cannot be taken, under the same guard a submission passes.
 */
export async function compareFacts(
  input: CompareInput,
): Promise<ToolPayload<FactsCompareSummary, FactsCompareData>> {
  const context = await buildFactsContext(input.path);
  if (!context.scope.declared)
    return buildUninitializedComparePayload(input.path);
  if (
    input.generationId !== undefined &&
    !GENERATION_ID.test(input.generationId)
  )
    return buildInvalidGenerationPayload(input.path, input.generationId);
  const frozen =
    input.generationId === undefined
      ? null
      : readGenerationFrozenFacts(input.path, input.generationId);
  if (input.generationId !== undefined && frozen === null)
    return buildUnfrozenGenerationPayload(input.path, input.generationId);
  const frozenByPath =
    frozen === null
      ? null
      : new Map(frozen.map((entry) => [entry.path, entry]));
  const entries = openSubmission(input.path, input.file, FACTS_ACTIONS.COMPARE);
  const submission = parseSubmittedRecords(entries);
  const table = readAdjudicationTable(context.storePaths.sideTableDirectory);
  const comparison: FactsCompareData = {
    missingInStore: [],
    missingInCandidate: [],
    resolutionDiffers: [],
    informational: [],
    sideTableItems: [],
  };
  const updates = new Map<string, AdjudicationPageUpdate>();
  const notIndependent: string[] = [];
  const againstFrozen: string[] = [];
  for (const { facts } of submission.parsed) {
    if (!context.scope.covers(facts.path)) continue;
    const current = hashProjectFile(input.path, facts.path);
    if (!current.ok) continue;
    const candidate = toComparableReferences(
      facts.references,
      current.contents.toString('utf8').split(/\r\n|\r|\n/),
      input.path,
      context.scannedSet,
    );
    const page = table.pages.get(context.storePaths.pathDigest(facts.path));
    // Against a generation's frozen facts when the caller names one: a verifier
    // compares with what the review was judged on, not with a store that moved
    // after it (spec §9). The items still land in the live side table.
    const baseline =
      frozenByPath === null
        ? storedComparableReferences(context, facts.path, page)
        : frozenReferences(frozenByPath.get(facts.path));
    const storedTool =
      context.records.get(facts.path)?.record.facts.provenance.tool;
    const result = demoteAuthoritative(
      compareReferences(candidate, baseline),
      storedTool,
      context.scope.provider,
    );
    collectFileComparison(comparison, facts.path, result);
    // Reported from what survives, not from what was read: an item whose judged
    // lines changed has expired, and naming it would offer a judgement that no
    // longer applies to the text in front of the reader.
    const key = context.storePaths.pathDigest(facts.path);
    const planned = planSideTableForCompare(
      table,
      key,
      facts.path,
      current,
      result,
    );
    // Two conditions clear the mark, and both must hold. A candidate from the
    // tool that wrote the record reproduces it, re-deriving nothing; and a
    // frozen baseline cannot see a loss the store took after the freeze.
    const independent =
      facts.provenance.tier === FACTS_TIERS.ATTESTED ||
      storedTool === undefined ||
      facts.provenance.tool !== storedTool;
    const awaiting = table.pages.get(key)?.awaitingComparison === true;
    if (awaiting && frozenByPath !== null) againstFrozen.push(facts.path);
    else if (awaiting && !independent) notIndependent.push(facts.path);
    updates.set(key, {
      ...planned,
      ...(independent && frozenByPath === null
        ? { awaitingComparison: false }
        : {}),
    });
    comparison.sideTableItems.push(
      ...describeAdjudicationItems(planned.items, current),
    );
  }
  const written = writeAdjudicationPages(
    context.storePaths.sideTableDirectory,
    table,
    updates,
    context.storePaths.shardFileName,
  );
  const recorded = [...updates]
    .filter(([key]) => written.stored.has(key))
    .reduce((total, [, update]) => total + update.items.length, 0);
  return {
    projectRoot: input.path,
    // A comparison whose items did not land found the disagreement and lost
    // it: reporting OK would say the store now holds something to judge when
    // it does not, and nobody would call compare again.
    status:
      written.conflicted.length > 0
        ? TOOL_STATUSES.INDETERMINATE
        : TOOL_STATUSES.OK,
    summary: {
      comparedFiles: submission.parsed.length,
      missingInStore: comparison.missingInStore.length,
      resolutionDiffers: comparison.resolutionDiffers.length,
      informational: comparison.informational.length,
      recordedItems: recorded,
      openItems: comparison.sideTableItems.filter((item) =>
        isOpenAdjudication(item.state),
      ).length,
      singleProvider: true,
    },
    data: capComparisonLists({
      ...comparison,
      ...(written.conflicted.length === 0
        ? {}
        : { unrecorded: capFileList(written.conflicted) }),
    }),
    diagnostics: [
      ...buildSideTableConflictDiagnostics(
        written.conflicted,
        FACTS_ACTIONS.COMPARE,
      ),
      ...(notIndependent.length === 0
        ? []
        : [
            {
              code: FACTS_COMPARISON_NOT_INDEPENDENT_CODE,
              message: `Nothing was re-derived for ${notIndependent.length} file(s) awaiting a comparison: the candidate declares the provenance.tool that wrote the record it would have to disagree with (${notIndependent.join(', ')}).`,
              path: input.path,
              affects: ANALYSIS_AXES,
              nextAction: FACTS_JUDGEMENTS_DISCARDED_NEXT_ACTION,
            },
          ]),
      ...(againstFrozen.length === 0
        ? []
        : [
            {
              code: FACTS_COMPARISON_NOT_AGAINST_STORE_CODE,
              message: `Nothing was re-derived for ${againstFrozen.length} file(s) awaiting a comparison: this call measured the candidate against the named generation's frozen facts, and what a discard took was taken from the store after that freeze (${againstFrozen.join(', ')}).`,
              path: input.path,
              affects: ANALYSIS_AXES,
              nextAction: FACTS_COMPARISON_AGAINST_STORE_NEXT_ACTION,
            },
          ]),
    ],
  };
}

/**
 * Demote resolution disagreements the project has already decided the answer to.
 *
 * `facts.provider` names whose resolution wins. When the stored record came from
 * that provider, another tool resolving the same specifier differently is a
 * known, legitimate difference — `x.ts` against `x.d.ts` — not something two
 * actors should be asked to judge. Leaving those on the table would hold the
 * file `uncertain` forever, which is the one outcome this setting exists to
 * prevent; without the setting they stay judgeable.
 *
 * @param comparison - The raw comparison for one file.
 * @param storedTool - The tool that produced the stored record.
 * @param provider - The project's declared authoritative provider.
 * @returns The comparison with authoritative disagreements moved to
 * `informational`.
 */
function demoteAuthoritative(
  comparison: ReturnType<typeof compareReferences>,
  storedTool: string | undefined,
  provider: string | undefined,
): ReturnType<typeof compareReferences> {
  if (provider === undefined || storedTool !== provider) return comparison;
  return {
    ...comparison,
    resolutionDiffers: [],
    informational: [...comparison.informational, ...comparison.resolutionDiffers],
  };
}

/**
 * One frozen entry's edges in the shape the comparison takes.
 * @param entry The generation's frozen facts for this file, when it froze any.
 * @returns Comparable references; empty when the generation froze none.
 */
function frozenReferences(
  entry: NormalizedFileFacts | undefined,
): ComparableReference[] {
  return (entry?.references ?? []).map((reference) => ({
    reference: reference.reference,
    kind: reference.kind,
    resolvedPath: reference.resolvedPath,
  }));
}
