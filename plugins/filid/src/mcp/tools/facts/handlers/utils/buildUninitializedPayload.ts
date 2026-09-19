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
 * Out of scope is a positive declaration, so a project that has not made one is
 * not quietly treated as covering nothing, and it is not a pass either: the
 * status is `unsupported` and the single diagnostic names the config edit that
 * changes it (spec §2.3, §3).
 *
 * @param projectRoot - Absolute project root, echoed into the payload.
 * @param resolutionEpoch - The epoch, which is well-defined without a scope.
 * @returns A status payload holding empty lists and one actionable diagnostic.
 */
export function buildUninitializedPayload(
  projectRoot: string,
  resolutionEpoch: string,
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
      outputRequirement: FACTS_OUTPUT_REQUIREMENT,
    },
    data: {
      missing: empty,
      needsResolution: empty,
      uncertain: empty,
      toolError: empty,
      rejected: empty,
      unadjudicated: empty,
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
