import {
  FACTS_ACTIONS,
  FACTS_ATTESTATION_OUTCOMES,
  FACTS_STATUS_LIST_LIMIT,
} from '../../../../constants/facts.js';
import { TOOL_STATUSES } from '../../../../constants/toolEnvelope.js';
import {
  parseSubmittedRecords,
  recordEpochDrift,
} from '../../../../core/facts/index.js';
import type { ToolPayload } from '../../../../types/toolEnvelope.js';
import type {
  FactsSubmitData,
  FactsSubmitSummary,
} from '../types/factsToolTypes.js';

import { buildConflictDiagnostics } from './utils/buildConflictDiagnostics.js';
import { buildPendingConflictDiagnostics } from './utils/buildPendingConflictDiagnostics.js';
import { buildRemovedAdjudicationDiagnostics } from './utils/buildRemovedAdjudicationDiagnostics.js';
import { buildSideTableConflictDiagnostics } from './utils/buildSideTableConflictDiagnostics.js';
import { buildEpochMovedPayload } from './utils/buildEpochMovedPayload.js';
import { buildUninitializedSubmitPayload } from './utils/buildUninitializedSubmitPayload.js';
import { buildFactsContext } from './utils/buildFactsContext.js';
import { capFileList } from './utils/capFileList.js';
import { openSubmission } from './utils/openSubmission.js';
import { storeAcceptedRecords } from './utils/storeAcceptedRecords.js';

/**
 * Take one batch of extracted facts and replace the store's view of its files.
 *
 * The order is the contract. The submission file is opened under the path guard
 * first, because everything after it reads caller-supplied data. The epoch is
 * then checked for the whole call — a batch resolved against a stale path list
 * is refused entirely rather than partly kept. Only then is each record checked
 * and stored on its own, so one bad record costs one record.
 *
 * The consecutive-epoch counter is cleared only when something actually landed.
 * A call whose every shard write lost its compare-and-set changed nothing, so
 * treating it as progress would let two writers reset each other's counter
 * forever and hide a tree that never settles.
 *
 * Both stores can lose a write, and both losses are reported. A submission that
 * stored its records but lost the side-table pages narrowed the graph without
 * opening the items that would have shown it, which is indeterminate, not OK.
 *
 * @param projectRoot - Absolute project root, used as given.
 * @param file - Absolute path of the extraction output, outside the project.
 * @param resolutionEpoch - The epoch the batch was extracted against.
 * @param actor - Self-declared actor of this call. Only attested records need
 * one, and they are refused individually when it is missing, so a batch of tool
 * records is unaffected by its absence.
 * @returns What was stored, removed and refused, with the current epoch.
 * @throws {ToolDiagnosticError} A `facts-file-*` code when the submission file
 * cannot be taken.
 */
export async function submitFacts(
  projectRoot: string,
  file: string,
  resolutionEpoch: string,
  actor = '',
): Promise<ToolPayload<FactsSubmitSummary, FactsSubmitData>> {
  const context = await buildFactsContext(projectRoot);
  if (!context.scope.declared)
    return buildUninitializedSubmitPayload(
      projectRoot,
      context.epoch.resolutionEpoch,
    );
  const entries = openSubmission(projectRoot, file);
  if (resolutionEpoch !== context.epoch.resolutionEpoch)
    return buildEpochMovedPayload(projectRoot, context);
  const submission = parseSubmittedRecords(entries);
  const outcome = storeAcceptedRecords(
    projectRoot,
    context,
    submission.parsed,
    actor,
  );
  if (outcome.accepted > 0 || outcome.removed > 0)
    recordEpochDrift(context.storePaths.driftPath, null);
  const rejected = [...submission.rejections, ...outcome.rejections];
  return {
    projectRoot,
    status:
      outcome.conflicted.length +
        outcome.sideTableConflicts.length +
        outcome.pendingConflicts.length >
      0
        ? TOOL_STATUSES.INDETERMINATE
        : TOOL_STATUSES.OK,
    summary: {
      resolutionEpoch: context.epoch.resolutionEpoch,
      accepted: outcome.accepted,
      removed: outcome.removed,
      rejectedRecords: submission.rejections.length + countRejectedRecords(outcome.rejections),
      rejectedClaims: rejected.length,
      epochMoved: false,
      openedItems: outcome.openedItems,
      closedItems: outcome.closedItems,
      removedAdjudicatedItems: outcome.removedAdjudicated,
      attestationsPending: countOutcome(
        outcome.attested,
        FACTS_ATTESTATION_OUTCOMES.PENDING,
      ),
      attestationsConfirmed: countOutcome(
        outcome.attested,
        FACTS_ATTESTATION_OUTCOMES.CONFIRMED,
      ),
      attestationDismissals: outcome.attestationDismissals,
    },
    data: {
      rejected: rejected.slice(0, FACTS_STATUS_LIST_LIMIT),
      rejectedTruncated: Math.max(0, rejected.length - FACTS_STATUS_LIST_LIMIT),
      added: capFileList([]),
      removed: capFileList([]),
      changedResolutionInputs: capFileList([]),
      attested: outcome.attested.slice(0, FACTS_STATUS_LIST_LIMIT),
    },
    diagnostics: [
      ...buildConflictDiagnostics(outcome.conflicted),
      ...buildSideTableConflictDiagnostics(
        outcome.sideTableConflicts,
        FACTS_ACTIONS.SUBMIT,
      ),
      ...buildPendingConflictDiagnostics(outcome.pendingConflicts),
      ...buildRemovedAdjudicationDiagnostics(outcome.removedAdjudicated),
    ],
  };
}

/**
 * How many attested records landed in one outcome.
 * @param attested Every attested record's report from this call.
 * @param outcome The outcome to count.
 * @returns The number of records that landed in it.
 */
function countOutcome(
  attested: readonly { outcome: string }[],
  outcome: string,
): number {
  return attested.filter((report) => report.outcome === outcome).length;
}

/**
 * How many rejections discarded a whole record rather than one of its claims.
 * @param rejections Every rejection this call produced below the schema gate.
 * @returns The count of record-level rejections.
 */
function countRejectedRecords(
  rejections: readonly { pointer: string }[],
): number {
  return rejections.filter((rejection) => /^\/\d+$/.test(rejection.pointer))
    .length;
}
