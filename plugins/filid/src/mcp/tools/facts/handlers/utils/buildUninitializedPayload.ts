import { ANALYSIS_AXES } from '../../../../../constants/analysisAxes.js';
import {
  FACTS_DIAGNOSTIC_CODES,
  FACTS_DIAGNOSTIC_NEXT_ACTIONS,
  FACTS_OUTPUT_REQUIREMENT,
  FACTS_PROJECT_STATES,
} from '../../../../../constants/facts.js';
import { TOOL_STATUSES } from '../../../../../constants/toolEnvelope.js';
import type { ToolPayload } from '../../../../../types/toolEnvelope.js';
import type {
  FactsStatusData,
  FactsStatusSummary,
} from '../../types/factsToolTypes.js';

import { capFileList } from './capFileList.js';

/**
 * The answer every facts action gives a project with no declared scope.
 *
 * Reached only when the effective scope covers nothing, which now means the
 * project declared an empty `facts.covers` — an absent declaration falls back
 * to the default scope instead. It is not a pass: the status is `unsupported`
 * and the diagnostic names the config edit that changes it (spec §2.3, §3).
 *
 * @param projectRoot - Absolute project root, echoed into the payload.
 * @param resolutionEpoch - The epoch, which is well-defined without a scope.
 * @param extractionListPath - Where the list would be written; no scope means
 * nothing to extract, so the file is reported empty rather than omitted.
 * @returns A status payload holding empty lists and one actionable diagnostic.
 */
export function buildUninitializedPayload(
  projectRoot: string,
  resolutionEpoch: string,
  extractionListPath: string,
): ToolPayload<FactsStatusSummary, FactsStatusData> {
  const empty = capFileList([]);
  return {
    projectRoot,
    status: TOOL_STATUSES.UNSUPPORTED,
    summary: {
      projectState: FACTS_PROJECT_STATES.UNINITIALIZED,
      resolutionEpoch,
      coveredFiles: 0,
      exact: 0,
      missing: 0,
      needsResolution: 0,
      uncertain: 0,
      toolError: 0,
      unsupported: 0,
      unadjudicatedItems: 0,
      scopeSource: 'config',
      outputRequirement: FACTS_OUTPUT_REQUIREMENT,
      extractionList: { path: extractionListPath, count: 0, unrepresentable: 0 },
    },
    data: {
      missing: empty,
      needsResolution: empty,
      uncertain: empty,
      toolError: empty,
      rejected: empty,
      unadjudicated: { items: [], truncated: 0 },
    },
    diagnostics: [
      {
        code: FACTS_DIAGNOSTIC_CODES.UNINITIALIZED,
        message:
          'This project has no facts.covers declaration, so filid holds no facts for it and every reference-based judgement is undefined rather than passing.',
        affects: ANALYSIS_AXES,
        nextAction: FACTS_DIAGNOSTIC_NEXT_ACTIONS.UNINITIALIZED,
      },
    ],
  };
}
