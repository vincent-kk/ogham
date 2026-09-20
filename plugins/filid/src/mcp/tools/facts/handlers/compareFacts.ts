import {
  FACTS_ACTIONS,
  FACTS_STATUS_LIST_LIMIT,
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
  AdjudicationPage,
  AdjudicationPageUpdate,
  ComparableReference,
} from '../../../../core/facts/index.js';
import type { ToolPayload } from '../../../../types/toolEnvelope.js';
import type {
  CompareInput,
  FactsCompareData,
  FactsCompareSummary,
} from '../types/factsToolTypes.js';

import { buildFactsContext } from './utils/buildFactsContext.js';
import { buildSideTableConflictDiagnostics } from './utils/buildSideTableConflictDiagnostics.js';
import { buildUninitializedComparePayload } from './utils/buildUninitializedComparePayload.js';
import { buildUnfrozenGenerationPayload } from './utils/buildUnfrozenGenerationPayload.js';
import { describeAdjudicationItems } from './utils/describeAdjudicationItems.js';
import { openSubmission } from './utils/openSubmission.js';
import { planSideTableForCompare } from './utils/planSideTableForCompare.js';
import { toComparableReferences } from './utils/toComparableReferences.js';

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
  if (input.generationId !== undefined)
    return buildUnfrozenGenerationPayload(input.path, input.generationId);
  const entries = openSubmission(input.path, input.file);
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
    const result = demoteAuthoritative(
      compareReferences(candidate, storedReferences(context, facts.path, page)),
      context.records.get(facts.path)?.record.facts.provenance.tool,
      context.scope.provider,
    );
    collect(comparison, facts.path, result);
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
    updates.set(key, planned);
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
    status: TOOL_STATUSES.OK,
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
    data: capped(comparison),
    diagnostics: buildSideTableConflictDiagnostics(
      written.conflicted,
      FACTS_ACTIONS.COMPARE,
    ),
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
 * The edges the store currently holds for one file: its record plus adopted.
 * @param context Store contents for this call.
 * @param path Project-relative path of the file.
 * @param page That file's side-table page, if any.
 * @returns Comparable references for everything the store stands behind.
 */
function storedReferences(
  context: Awaited<ReturnType<typeof buildFactsContext>>,
  path: string,
  page: AdjudicationPage | undefined,
): ComparableReference[] {
  const record = context.records.get(path)?.record;
  return (record?.facts.references ?? []).flatMap(
    (reference): ComparableReference[] => [
      {
        reference: reference.sourceText ?? reference.specifier,
        kind: reference.kind,
        resolvedPath:
          'path' in reference.resolved ? reference.resolved.path : null,
      },
    ],
  ).concat(
    (page?.items ?? [])
      .filter((item) => item.state === 'adopted')
      .map((item) => ({
        reference: item.reference,
        kind: item.kind,
        resolvedPath: item.resolvedPath,
      })),
  );
}

/**
 * Fold one file's comparison into the response buckets.
 * @param into Accumulating comparison data.
 * @param path File the references belong to.
 * @param result That file's comparison.
 */
function collect(
  into: FactsCompareData,
  path: string,
  result: ReturnType<typeof compareReferences>,
): void {
  for (const bucket of [
    'missingInStore',
    'missingInCandidate',
    'resolutionDiffers',
    'informational',
  ] as const)
    for (const one of result[bucket])
      into[bucket].push({ path, ...one });
}

/**
 * Bound every list so one comparison cannot fill the response.
 * @param comparison The full comparison.
 * @returns The same shape with each list cut to the shared limit.
 */
function capped(comparison: FactsCompareData): FactsCompareData {
  return {
    missingInStore: comparison.missingInStore.slice(0, FACTS_STATUS_LIST_LIMIT),
    missingInCandidate: comparison.missingInCandidate.slice(
      0,
      FACTS_STATUS_LIST_LIMIT,
    ),
    resolutionDiffers: comparison.resolutionDiffers.slice(
      0,
      FACTS_STATUS_LIST_LIMIT,
    ),
    informational: comparison.informational.slice(0, FACTS_STATUS_LIST_LIMIT),
    sideTableItems: comparison.sideTableItems.slice(0, FACTS_STATUS_LIST_LIMIT),
  };
}
