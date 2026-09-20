import { ANALYSIS_AXES } from '../../../../../constants/analysisAxes.js';
import {
  FACTS_DIAGNOSTIC_CODES,
  FACTS_DIAGNOSTIC_NEXT_ACTIONS,
} from '../../../../../constants/facts.js';
import { TOOL_STATUSES } from '../../../../../constants/toolEnvelope.js';
import type { ToolPayload } from '../../../../../types/toolEnvelope.js';
import type {
  FactsSubmitData,
  FactsSubmitSummary,
} from '../../types/factsToolTypes.js';

import { capFileList } from './capFileList.js';

/**
 * The submit answer for a project that has declared no facts scope.
 *
 * Refused rather than stored empty: with no `facts.covers` every record in the
 * batch is out of scope, and a submission may not widen the scope (spec §2.3).
 *
 * @param projectRoot - Absolute project root, echoed into the payload.
 * @param resolutionEpoch - The epoch, which is defined without a scope.
 * @returns A payload that stored nothing, with the config edit as next action.
 */
export function buildUninitializedSubmitPayload(
  projectRoot: string,
  resolutionEpoch: string,
): ToolPayload<FactsSubmitSummary, FactsSubmitData> {
  return {
    projectRoot,
    status: TOOL_STATUSES.UNSUPPORTED,
    summary: {
      resolutionEpoch,
      accepted: 0,
      removed: 0,
      rejectedRecords: 0,
      rejectedClaims: 0,
      epochMoved: false,
      openedItems: 0,
      closedItems: 0,
      attestationsPending: 0,
      attestationsConfirmed: 0,
      attestationDismissals: 0,
      removedAdjudicatedItems: 0,
    },
    data: {
      rejected: [],
      rejectedTruncated: 0,
      added: capFileList([]),
      removed: capFileList([]),
      attested: [],
      changedResolutionInputs: capFileList([]),
    },
    diagnostics: [
      {
        code: FACTS_DIAGNOSTIC_CODES.UNINITIALIZED,
        message:
          'This project has no facts.covers declaration, so every record in this batch would be out of scope and submission cannot widen the scope.',
        affects: ANALYSIS_AXES,
        nextAction: FACTS_DIAGNOSTIC_NEXT_ACTIONS.UNINITIALIZED,
      },
    ],
  };
}
