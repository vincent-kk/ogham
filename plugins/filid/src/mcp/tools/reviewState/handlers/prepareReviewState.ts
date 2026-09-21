import {
  assertNoSymlinkDescendantsSync,
  readUtf8FileIfExistsSync,
} from '@ogham/cross-platform';

import {
  REVIEW_STATE_DIAGNOSTIC_CODES,
  REVIEW_STATE_DIAGNOSTIC_NEXT_ACTIONS,
} from '../../../../constants/reviewState.js';
import { archiveReplacedReviewState } from '../state/archiveReplacedReviewState.js';
import { linkReplacementChain } from '../state/linkReplacementChain.js';
import { readAbandonedReviewTrace } from '../state/readAbandonedReviewTrace.js';
import { readReviewState } from '../state/readReviewState.js';
import { readUnusableReviewStateReason } from '../state/readUnusableReviewStateReason.js';
import {
  resolveLegacyReviewStatePaths,
  resolveReviewStatePaths,
} from '../state/resolveReviewStatePaths.js';
import type {
  ResolvedReviewStateInput,
  ReviewPreparePayload,
  ReviewStateRecord,
} from '../state/reviewStateTypes.js';

import { prepareIncrementalReviewState } from './prepareIncrementalReviewState.js';

/**
 * Prepare committed file review through the ordinary host-independent API.
 *
 * A state no action can carry to a verdict — unreadable, another schema,
 * pre-incremental, or validated under an unsupported policy — is archived and
 * replaced here rather than handed to a person: the only outcomes were "start
 * again" and "give up". Paths resolve from the branch directory first, so a
 * malformed state cannot stop its own replacement.
 *
 * @param input Resolved prepare request with optional user review criteria.
 * @returns Prepared generation and executable handoffs, with a `review-state-replaced` diagnostic when a state was archived.
 * @throws When the review paths themselves cannot be resolved.
 */
export async function prepareReviewState(
  input: Extract<ResolvedReviewStateInput, { action: 'prepare' }>,
): Promise<ReviewPreparePayload> {
  const branchPaths = resolveLegacyReviewStatePaths(
    input.projectRoot,
    input.branchName,
  );
  assertNoSymlinkDescendantsSync(input.projectRoot, branchPaths.statePath);
  const reason = readUnusableReviewStateReason(branchPaths.statePath);
  if (reason === null) {
    const paths = resolveReviewStatePaths(input.projectRoot, input.branchName);
    const restored = readReviewState(paths.statePath);
    const previous = restored && !('kind' in restored) ? restored : null;
    if (previous) return prepareIncrementalReviewState(input, paths, previous);
    const trace = readAbandonedReviewTrace(branchPaths.reviewDirectory);
    return prepareIncrementalReviewState(
      input,
      paths,
      null,
      trace.abandoned
        ? {
            reason: REVIEW_STATE_DIAGNOSTIC_CODES.STATE_MISSING,
            ...(trace.priorVerdict ? { priorVerdict: trace.priorVerdict } : {}),
          }
        : undefined,
    );
  }
  const archived = readUtf8FileIfExistsSync(branchPaths.statePath);
  const archivePath = archiveReplacedReviewState(
    branchPaths.reviewDirectory,
    branchPaths.statePath,
  );
  const prepared = await prepareIncrementalReviewState(
    input,
    branchPaths,
    null,
    linkReplacementChain(
      { reason, archivePath, ...readArchivedIdentity(archived) },
      readArchivedCarrier(archived),
    ),
  );
  return {
    ...prepared,
    diagnostics: [
      ...prepared.diagnostics,
      {
        code: REVIEW_STATE_DIAGNOSTIC_CODES.STATE_REPLACED,
        message: `The review state at ${branchPaths.statePath} could not be used (${reason}); its bytes are kept at ${archivePath}.`,
        path: archivePath,
        affects: [],
        nextAction: REVIEW_STATE_DIAGNOSTIC_NEXT_ACTIONS.STATE_REPLACED,
      },
    ],
  };
}

/**
 * Carry what the archived state still says about itself into the new record.
 *
 * Bytes that no longer parse carry nothing; that is why both fields are
 * optional on the replacement record.
 *
 * @param archived Raw bytes of the state that was moved aside, or null.
 * @returns The prior generation and verdict when they can be read.
 */
function readArchivedIdentity(archived: string | null): {
  priorGenerationId?: string;
  priorVerdict?: ReviewStateRecord['verdict'] & string;
} {
  if (archived === null) return {};
  let value: unknown;
  try {
    value = JSON.parse(archived);
  } catch {
    return {};
  }
  if (!value || typeof value !== 'object') return {};
  const record = value as Record<string, unknown>;
  const generationId = record.generationId;
  const verdict = record.verdict;
  return {
    ...(typeof generationId === 'string' && /^[a-f0-9]{32}$/.test(generationId)
      ? { priorGenerationId: generationId }
      : {}),
    ...(verdict === 'APPROVED' ||
    verdict === 'REQUEST_CHANGES' ||
    verdict === 'INCONCLUSIVE'
      ? { priorVerdict: verdict }
      : {}),
  };
}

/**
 * Read the replacement an archived state itself carried, so a chain survives.
 * @param archived Raw bytes of the state that was moved aside, or null.
 * @returns A carrier with that record's `replacedFrom`, or null when unreadable.
 */
function readArchivedCarrier(
  archived: string | null,
): Pick<ReviewStateRecord, 'replacedFrom'> | null {
  if (archived === null) return null;
  try {
    const value: unknown = JSON.parse(archived);
    if (!value || typeof value !== 'object') return null;
    const replacedFrom = (value as ReviewStateRecord).replacedFrom;
    return replacedFrom ? { replacedFrom } : null;
  } catch {
    return null;
  }
}
