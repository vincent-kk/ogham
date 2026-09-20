import {
  FACTS_FILE_STATES,
  FACTS_OUTPUT_REQUIREMENT,
  FACTS_PROJECT_STATES,
  FACTS_STATUS_LIST_LIMIT,
} from '../../../../constants/facts.js';
import { TOOL_STATUSES } from '../../../../constants/toolEnvelope.js';
import {
  readAdjudicationTable,
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
import { classifyScannedFiles } from './utils/classifyScannedFiles.js';
import { capFileList } from './utils/capFileList.js';
import { collectOpenItems } from './utils/collectOpenItems.js';

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
  const unadjudicated = collectOpenItems(
    projectRoot,
    context,
    readAdjudicationTable(context.storePaths.sideTableDirectory),
  );
  const byState = classifyScannedFiles(
    projectRoot,
    context,
    new Set(unadjudicated.map((item) => item.path)),
  );
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
  const rejected = context.scannedPaths.filter(
    (path) => (context.records.get(path)?.record.rejectedClaims ?? 0) > 0,
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
      rejected: capFileList(rejected),
      unadjudicated: {
        items: unadjudicated.slice(0, FACTS_STATUS_LIST_LIMIT),
        truncated: Math.max(0, unadjudicated.length - FACTS_STATUS_LIST_LIMIT),
      },
    },
    diagnostics: [],
  };
}
