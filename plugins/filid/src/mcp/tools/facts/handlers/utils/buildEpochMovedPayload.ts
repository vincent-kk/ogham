import { ANALYSIS_AXES } from '../../../../../constants/analysisAxes.js';
import {
  FACTS_DIAGNOSTIC_CODES,
  FACTS_DIAGNOSTIC_NEXT_ACTIONS,
} from '../../../../../constants/facts.js';
import { TOOL_STATUSES } from '../../../../../constants/toolEnvelope.js';
import { diffEpochSnapshots, recordEpochDrift } from '../../../../../core/facts/index.js';
import type { ToolPayload } from '../../../../../types/toolEnvelope.js';
import type {
  FactsSubmitData,
  FactsSubmitSummary,
} from '../../types/factsToolTypes.js';

import type { FactsContext } from './buildFactsContext.js';
import { capFileList } from './capFileList.js';

/**
 * Refuse a whole submission whose epoch has moved, and say what moved.
 *
 * The epoch check is all-or-nothing for the call (spec §2.4): a batch resolved
 * against a path list that no longer holds has every one of its resolutions in
 * doubt, so storing the records that happen to still look right would keep
 * exactly the wrong ones.
 *
 * Being told to re-extract is only a next action while it can converge. When a
 * caller has been handed three different new epochs in a row, the tree is being
 * written to faster than it can be read, and the answer changes from "extract
 * again" to "find what is writing" — which the path difference names.
 *
 * @param projectRoot - Absolute project root, echoed into the payload.
 * @param context - The epoch this call computed and the one recorded before it.
 * @returns A payload that stored nothing, carrying the new epoch and the
 * difference from the epoch the caller submitted against.
 */
export function buildEpochMovedPayload(
  projectRoot: string,
  context: FactsContext,
): ToolPayload<FactsSubmitSummary, FactsSubmitData> {
  const difference = diffEpochSnapshots(context.previousEpoch, context.epoch);
  const drift = recordEpochDrift(
    context.storePaths.driftPath,
    context.epoch.resolutionEpoch,
  );
  const key = drift.unstable ? 'TREE_UNSTABLE' : 'EPOCH_MOVED';
  return {
    projectRoot,
    status: drift.unstable
      ? TOOL_STATUSES.UNSUPPORTED
      : TOOL_STATUSES.INDETERMINATE,
    summary: {
      resolutionEpoch: context.epoch.resolutionEpoch,
      accepted: 0,
      removed: 0,
      rejectedRecords: 0,
      rejectedClaims: 0,
      epochMoved: true,
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
      added: capFileList(difference.added),
      removed: capFileList(difference.removed),
      attested: [],
      changedResolutionInputs: capFileList(difference.changedResolutionInputs),
    },
    diagnostics: [
      {
        code: FACTS_DIAGNOSTIC_CODES[key],
        message: drift.unstable
          ? `The project's path list changed ${drift.consecutive} times in a row without a submission landing, so re-extracting cannot catch up.`
          : "The project's resolution epoch moved after this batch was extracted, so nothing was stored.",
        affects: ANALYSIS_AXES,
        nextAction: FACTS_DIAGNOSTIC_NEXT_ACTIONS[key],
      },
    ],
  };
}
