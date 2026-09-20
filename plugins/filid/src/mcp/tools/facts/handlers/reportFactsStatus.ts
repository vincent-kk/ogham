import {
  FACTS_ATTESTATION_NEXT_ACTIONS,
  FACTS_ATTESTATION_OUTCOMES,
  FACTS_ATTESTED_REQUIREMENT,
  FACTS_FILE_STATES,
  FACTS_JUDGEMENTS_DISCARDED_NEXT_ACTION,
  FACTS_OUTPUT_REQUIREMENT,
  FACTS_PROJECT_STATES,
  FACTS_STATUS_LIST_LIMIT,
  FACTS_UNKNOWN_CAUSES,
} from '../../../../constants/facts.js';
import { ANALYSIS_AXES } from '../../../../constants/analysisAxes.js';
import { ANALYSIS_CERTAINTIES } from '../../../../constants/analysisCertainties.js';
import { TOOL_STATUSES } from '../../../../constants/toolEnvelope.js';
import {
  classifyProjectFacts,
  damagedJudgementDiagnostics,
  writeExtractionList,
} from '../../../../core/facts/index.js';
import type { FactsFileState } from '../../../../core/facts/index.js';
import type { ToolPayload } from '../../../../types/toolEnvelope.js';
import type {
  FactsStatusData,
  FactsStatusSummary,
} from '../types/factsToolTypes.js';

import { buildFactsContext } from './utils/buildFactsContext.js';
import { buildUninitializedPayload } from './utils/buildUninitializedPayload.js';
import { capFileList } from './utils/capFileList.js';
import { collectOpenItems } from './utils/collectOpenItems.js';
import { collectRejectedClaims } from './utils/collectRejectedClaims.js';

/**
 * Report what filid knows about a project's facts, and what it is waiting for.
 *
 * Read-only with respect to the project; the list of files to extract is
 * written to the server's own cache directory, which the agent can read and
 * cannot write.
 * Every in-scope file is classified, so
 * the answer distinguishes "nothing was submitted" from "the submissions no
 * longer bind" — the difference between a first extraction and a re-resolution,
 * which is the next action the caller has to choose between.
 *
 * It is also the one place the whole side table is readable. Both other ways an
 * item can appear are tied to a batch somebody happened to submit, so the open
 * items are listed here in full — each with the lines and the `contentHash` that
 * judging it takes — and the agent needs no other call to close the loop.
 *
 * @param projectRoot - Absolute project root, used as given.
 * @returns A payload whose summary carries the counts and whose data carries
 * the per-state lists, each capped with the number of entries omitted.
 */
export async function reportFactsStatus(
  projectRoot: string,
): Promise<ToolPayload<FactsStatusSummary, FactsStatusData>> {
  const context = await buildFactsContext(projectRoot);
  if (!context.scope.declared)
    return buildUninitializedPayload(
      projectRoot,
      context.epoch.resolutionEpoch,
      context.storePaths.extractionListPath,
    );
  const unadjudicated = collectOpenItems(projectRoot, context);
  const pendingAttestations = [...context.pending.values()]
    .filter(
      (page) =>
        context.scannedSet.has(page.path) && context.scope.covers(page.path),
    )
    .sort((left, right) => left.path.localeCompare(right.path))
    .map((page) => ({
      path: page.path,
      actor: page.actor,
      contentHash: page.contentHash,
      nextAction:
        FACTS_ATTESTATION_NEXT_ACTIONS[FACTS_ATTESTATION_OUTCOMES.PENDING],
    }));
  const byState = classifyProjectFacts(projectRoot, context);
  const paths = (state: FactsFileState): string[] =>
    context.scannedPaths.filter((path) => byState.get(path) === state);
  const missing = paths(FACTS_FILE_STATES.MISSING);
  const needsResolution = paths(FACTS_FILE_STATES.NEEDS_RESOLUTION);
  const uncertain = paths(FACTS_FILE_STATES.UNCERTAIN);
  const toolError = paths(FACTS_FILE_STATES.TOOL_ERROR);
  const extractionList = writeExtractionList(
    context.storePaths.extractionListPath,
    [...missing, ...needsResolution].sort((left, right) =>
      left.localeCompare(right),
    ),
  );
  const rejected = collectRejectedClaims(context);
  const awaitingComparison = context.scannedPaths
    .filter(
      (path) => context.adjudications.get(path)?.awaitingComparison === true,
    )
    .map((path) => {
      const storedTool =
        context.records.get(path)?.record.facts.provenance.tool;
      return { path, ...(storedTool === undefined ? {} : { storedTool }) };
    });
  const indeterminate = context.scannedPaths.filter((path) =>
    (context.records.get(path)?.record.facts.references ?? []).some(
      (reference) =>
        reference.certainty === ANALYSIS_CERTAINTIES.INDETERMINATE,
    ),
  );
  return {
    projectRoot,
    status: TOOL_STATUSES.OK,
    summary: {
      projectState: FACTS_PROJECT_STATES.READY,
      resolutionEpoch: context.epoch.resolutionEpoch,
      coveredFiles: context.scannedPaths.length - paths(FACTS_FILE_STATES.UNSUPPORTED).length,
      exact: paths(FACTS_FILE_STATES.EXACT).length,
      missing: missing.length,
      needsResolution: needsResolution.length,
      uncertain: uncertain.length,
      toolError: toolError.length,
      unsupported: paths(FACTS_FILE_STATES.UNSUPPORTED).length,
      unadjudicatedItems: unadjudicated.length,
      pendingAttestations: pendingAttestations.length,
      attestationRequirement: FACTS_ATTESTED_REQUIREMENT,
      scopeSource: context.scope.source,
      outputRequirement: FACTS_OUTPUT_REQUIREMENT,
      extractionList: {
        path: context.storePaths.extractionListPath,
        ...extractionList,
      },
    },
    data: {
      missing: capFileList(missing),
      needsResolution: capFileList(needsResolution),
      uncertain: capFileList(uncertain),
      toolError: capFileList(toolError),
      indeterminate: capFileList(indeterminate),
      awaitingComparison: {
        items: awaitingComparison.slice(0, FACTS_STATUS_LIST_LIMIT),
        truncated: Math.max(
          0,
          awaitingComparison.length - FACTS_STATUS_LIST_LIMIT,
        ),
      },
      rejected: {
        items: rejected.slice(0, FACTS_STATUS_LIST_LIMIT),
        truncated: Math.max(0, rejected.length - FACTS_STATUS_LIST_LIMIT),
      },
      unadjudicated: {
        items: unadjudicated.slice(0, FACTS_STATUS_LIST_LIMIT),
        truncated: Math.max(0, unadjudicated.length - FACTS_STATUS_LIST_LIMIT),
      },
      pendingAttestations: pendingAttestations.slice(
        0,
        FACTS_STATUS_LIST_LIMIT,
      ),
    },
    diagnostics: [
      ...damagedJudgementDiagnostics(context),
      ...(awaitingComparison.length === 0
        ? []
        : [
            {
              code: FACTS_UNKNOWN_CAUSES.JUDGEMENTS_DISCARDED,
              message: `${awaitingComparison.length} file(s) lost their judgements to a discard and nobody has re-derived them, so they are reported uncertain rather than settled.`,
              nextAction: FACTS_JUDGEMENTS_DISCARDED_NEXT_ACTION,
            },
          ]),
    ].map((report) => ({
      ...report,
      path: projectRoot,
      affects: ANALYSIS_AXES,
    })),
  };
}
