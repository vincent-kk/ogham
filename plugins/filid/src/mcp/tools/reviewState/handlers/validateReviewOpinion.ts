import {
  REVIEW_STATE_DIAGNOSTIC_CODES,
  REVIEW_STATE_DIAGNOSTIC_MESSAGES,
  REVIEW_STATE_DISPOSITIONS,
  REVIEW_STATE_PHASES,
  REVIEW_VALIDATE_KINDS,
} from '../../../../constants/reviewState.js';
import { TOOL_STATUSES } from '../../../../constants/toolEnvelope.js';
import { computeReviewSourceHash } from '../hash/computeReviewSourceHash.js';
import { assertReviewStatePaths } from '../state/assertReviewStatePaths.js';
import { assertReviewValidationPolicy } from '../state/assertReviewValidationPolicy.js';
import { createReviewStatePayload } from '../state/createReviewStatePayload.js';
import { readReviewState } from '../state/readReviewState.js';
import { resolveReviewStatePaths } from '../state/resolveReviewStatePaths.js';
import type {
  ReviewStatePayload,
  ReviewValidatePayload,
} from '../state/reviewStateTypes.js';

import { assertReviewInputsFresh } from './utils/assertReviewInputsFresh.js';
import { validateReviewRound } from './validate/validateReviewRound.js';
import { validateVerifierOpinion } from './validate/validateVerifierOpinion.js';
import type { ValidateReviewInput } from './validate/validationHandlerTypes.js';

/**
 * Validate one reviewer round or verifier decision artifact.
 *
 * @param input Validated branch, group, kind, and optional round request.
 * @returns Missing/stale state or an artifact-level validation result.
 */
export async function validateReviewOpinion(
  input: ValidateReviewInput,
): Promise<ReviewStatePayload | ReviewValidatePayload> {
  const paths = resolveReviewStatePaths(input.projectRoot, input.branchName);
  assertReviewStatePaths(paths);
  const restored = readReviewState(paths.statePath);
  if (restored === null || 'kind' in restored) {
    const schemaMismatch = restored !== null;
    const base = createReviewStatePayload({
      action: input.action,
      disposition: REVIEW_STATE_DISPOSITIONS.MISSING,
      paths,
      status: TOOL_STATUSES.INDETERMINATE,
      diagnostics: [
        {
          code: schemaMismatch
            ? REVIEW_STATE_DIAGNOSTIC_CODES.STATE_SCHEMA_MISMATCH
            : REVIEW_STATE_DIAGNOSTIC_CODES.STATE_MISSING,
          message: schemaMismatch
            ? REVIEW_STATE_DIAGNOSTIC_MESSAGES.STATE_SCHEMA_MISMATCH
            : REVIEW_STATE_DIAGNOSTIC_MESSAGES.STATE_MISSING,
          path: paths.statePath,
          nextAction: schemaMismatch
            ? "Do not publish a verdict. Ask the user whether to start a fresh review; only on the user's request, and after all prior actors finish, call prepare with force: true, because prepare without force refuses this state with review-incremental-bootstrap-required."
            : 'Do not publish a verdict. Once, after all prior actors finish, call prepare again with the original arguments to start a new review; if the state goes missing again, stop without a terminal verdict.',
        },
      ],
    });
    return {
      ...base,
      summary: {
        ...base.summary,
        kind: input.kind,
        group: input.group,
        ...(input.round === undefined ? {} : { round: input.round }),
        ok: false,
        problemCount: 0,
      },
      data: { ...base.data, problems: [] },
    };
  }

  assertReviewValidationPolicy(restored);
  const source = await computeReviewSourceHash(
    input.projectRoot,
    restored.baseRef,
  );
  if (source.sourceHash !== restored.sourceHash) {
    const base = createReviewStatePayload({
      action: input.action,
      disposition: REVIEW_STATE_DISPOSITIONS.STALE,
      paths,
      status: TOOL_STATUSES.INDETERMINATE,
      state: restored,
      diagnostics: [
        {
          code: REVIEW_STATE_DIAGNOSTIC_CODES.SOURCE_HASH_STALE,
          message: REVIEW_STATE_DIAGNOSTIC_MESSAGES.SOURCE_HASH_STALE,
          path: paths.statePath,
          nextAction:
            'Do not seal or publish a verdict for this state. After every in-flight actor finishes, call prepare again with the same arguments and without force; it reuses validated opinions for unchanged files. If the source changes again, stop without a terminal verdict.',
        },
      ],
    });
    return {
      ...base,
      summary: {
        ...base.summary,
        kind: input.kind,
        group: input.group,
        ...(input.round === undefined ? {} : { round: input.round }),
        ok: false,
        problemCount: 0,
      },
      data: { ...base.data, problems: [] },
    };
  }
  await assertReviewInputsFresh(restored, paths, 'validate', input.group);
  if (restored.phase === REVIEW_STATE_PHASES.SEALED)
    throw new Error('sealed review state cannot validate opinions');
  const group = restored.groups.find(({ id }) => id === input.group);
  if (!group) throw new Error(`review group does not exist: ${input.group}`);
  const context = {
    input: input as ValidateReviewInput,
    paths,
    state: restored,
    group,
  };

  if (input.kind === REVIEW_VALIDATE_KINDS.REVIEW) {
    if (group.rounds === 0)
      throw new Error(`review group ${group.id} has no review rounds`);
    if (
      input.round === undefined ||
      !Number.isInteger(input.round) ||
      input.round < 1 ||
      input.round > group.rounds
    )
      throw new Error(
        `review round must be between 1 and ${String(group.rounds)}`,
      );
    return validateReviewRound(context);
  }
  if (input.kind === REVIEW_VALIDATE_KINDS.VERIFY) {
    if (input.round !== undefined)
      throw new Error('round is not allowed for verify validation');
    if (!group.validated.review?.complete)
      throw new Error('review validation must be complete before verify');
    return validateVerifierOpinion(context);
  }
  throw new Error('validate kind must be review or verify');
}
