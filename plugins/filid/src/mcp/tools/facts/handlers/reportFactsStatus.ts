import {
  FACTS_FILE_STATES,
  FACTS_OUTPUT_REQUIREMENT,
  FACTS_PROJECT_STATES,
} from '../../../../constants/facts.js';
import { TOOL_STATUSES } from '../../../../constants/toolEnvelope.js';
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

/**
 * Report what filid knows about a project's facts, and what it is waiting for.
 *
 * Read-only with respect to the project. Every in-scope file is classified, so
 * the answer distinguishes "nothing was submitted" from "the submissions no
 * longer bind" — the difference between a first extraction and a re-resolution,
 * which is the next action the caller has to choose between.
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
    return buildUninitializedPayload(projectRoot, context.epoch.resolutionEpoch);
  const byState = classifyScannedFiles(projectRoot, context);
  const paths = (state: FactsFileState): string[] =>
    context.scannedPaths.filter((path) => byState.get(path) === state);
  const missing = paths(FACTS_FILE_STATES.MISSING);
  const needsResolution = paths(FACTS_FILE_STATES.NEEDS_RESOLUTION);
  const uncertain = paths(FACTS_FILE_STATES.UNCERTAIN);
  const toolError = paths(FACTS_FILE_STATES.TOOL_ERROR);
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
      outputRequirement: FACTS_OUTPUT_REQUIREMENT,
    },
    data: {
      missing: capFileList(missing),
      needsResolution: capFileList(needsResolution),
      uncertain: capFileList(uncertain),
      toolError: capFileList(toolError),
      rejected: capFileList(rejected),
      unadjudicated: capFileList([]),
    },
    diagnostics: [],
  };
}
