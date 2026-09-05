import { readUtf8FileIfExistsSync } from '@ogham/cross-platform';

import {
  REVIEW_STATE_DIAGNOSTIC_CODES,
  REVIEW_STATE_DIAGNOSTIC_MESSAGES,
  REVIEW_VALIDATE_KINDS,
} from '../../../../../constants/reviewState.js';
import { TOOL_STATUSES } from '../../../../../constants/toolEnvelope.js';
import { planNextHandoffs } from '../../handoff/planNextHandoffs.js';
import { readReviewGroupArtifactStatus } from '../../handoff/readReviewGroupArtifactStatus.js';
import { computeReviewArtifactHash } from '../../hash/computeReviewArtifactHash.js';
import { checkReviewOpinion } from '../../opinion/checkReviewOpinion.js';
import { checkVerifyOpinion } from '../../opinion/checkVerifyOpinion.js';
import { parseReviewOpinion } from '../../opinion/parseReviewOpinion.js';
import { parseVerifyOpinion } from '../../opinion/parseVerifyOpinion.js';
import { splitVerifierAssignment } from '../../opinion/splitVerifierAssignment.js';
import type { VerifyOpinion } from '../../opinion/verifyOpinionTypes.js';
import { resolveReviewArtifactPath } from '../../state/resolveReviewArtifactPath.js';
import type {
  ReviewValidatePayload,
  ReviewValidationProblem,
} from '../../state/reviewStateTypes.js';
import { writeReviewState } from '../../state/writeReviewState.js';

import { createValidatePayload } from './createValidatePayload.js';
import type { ValidateOpinionContext } from './validationHandlerTypes.js';

/**
 * Validate and hash-bind one verifier opinion to its merged review.
 *
 * @param context Prepared state, selected group, paths, and validated request.
 * @returns Validation problems or the persisted verifier handoff.
 */
export function validateVerifierOpinion(
  context: ValidateOpinionContext,
): ReviewValidatePayload {
  const { input, paths, state, group } = context;
  const reviewValidation = group.validated.review!;
  const opinionPath = resolveReviewArtifactPath(paths, group.opinionPath);
  const opinionBytes = readUtf8FileIfExistsSync(opinionPath);
  if (
    opinionBytes === null ||
    computeReviewArtifactHash(opinionBytes) !== reviewValidation.sha256
  )
    throw new Error(`validated review opinion changed for group ${group.id}`);
  const reviewParsed = parseReviewOpinion(opinionBytes);
  if (
    reviewParsed.opinion === null ||
    !checkReviewOpinion(
      reviewParsed.opinion,
      {
        group: group.id,
        round: reviewValidation.round,
        sourceHash: state.sourceHash,
        units: group.units,
      },
      [],
    )
  )
    throw new Error(`validated review opinion is invalid for ${group.id}`);
  const decisionIds = splitVerifierAssignment(
    reviewParsed.opinion.findings,
  ).assigned.map((finding) => finding.id);
  const verifyPath = resolveReviewArtifactPath(paths, group.verifyPath);
  const verifyBytes = readUtf8FileIfExistsSync(verifyPath);
  if (verifyBytes === null)
    return createValidatePayload({
      handoff: planNextHandoffs({
        state,
        paths,
        statuses: readReviewGroupArtifactStatus(state, paths),
      }),
      action: input.action,
      paths,
      status: TOOL_STATUSES.INDETERMINATE,
      kind: REVIEW_VALIDATE_KINDS.VERIFY,
      group: input.group,
      problems: [],
      ok: false,
      problemCount: 0,
      confirmed: 0,
      refuted: 0,
      indeterminate: 0,
      diagnostics: [
        {
          code: REVIEW_STATE_DIAGNOSTIC_CODES.OPINION_INVALID,
          message: REVIEW_STATE_DIAGNOSTIC_MESSAGES.OPINION_INVALID,
          path: verifyPath,
        },
      ],
      verifyPath,
    });

  const parsed = parseVerifyOpinion(verifyBytes);
  const problems: ReviewValidationProblem[] =
    parsed.opinion === null ? [...parsed.problems] : [];
  let opinion: VerifyOpinion | null = null;
  if (
    parsed.opinion !== null &&
    checkVerifyOpinion(
      parsed.opinion,
      {
        group: group.id,
        sourceHash: state.sourceHash,
        decisionIds,
      },
      problems,
    )
  )
    opinion = parsed.opinion;
  if (opinion === null)
    return createValidatePayload({
      handoff: planNextHandoffs({
        state,
        paths,
        statuses: readReviewGroupArtifactStatus(state, paths),
      }),
      action: input.action,
      paths,
      status: TOOL_STATUSES.OK,
      kind: REVIEW_VALIDATE_KINDS.VERIFY,
      group: input.group,
      problems,
      ok: false,
      problemCount: problems.length,
      confirmed: 0,
      refuted: 0,
      indeterminate: 0,
      verifyPath,
    });

  const confirmed = opinion.decisions.filter(
    ({ verdict }) => verdict === 'CONFIRMED',
  ).length;
  const refuted = opinion.decisions.filter(
    ({ verdict }) => verdict === 'REFUTED',
  ).length;
  const indeterminate = opinion.decisions.filter(
    ({ verdict }) => verdict === 'INDETERMINATE',
  ).length;
  const updatedState = {
    ...state,
    groups: state.groups.map((candidateGroup) =>
      candidateGroup.id === group.id
        ? {
            ...candidateGroup,
            validated: {
              review: candidateGroup.validated.review,
              verify: {
                sha256: computeReviewArtifactHash(verifyBytes),
                reviewSha256: reviewValidation.sha256,
              },
            },
          }
        : candidateGroup,
    ),
  };
  writeReviewState(paths.statePath, updatedState);
  return createValidatePayload({
    handoff: planNextHandoffs({
      state: updatedState,
      paths,
      statuses: readReviewGroupArtifactStatus(updatedState, paths),
    }),
    action: input.action,
    paths,
    status: TOOL_STATUSES.OK,
    kind: REVIEW_VALIDATE_KINDS.VERIFY,
    group: input.group,
    problems: [],
    ok: true,
    problemCount: 0,
    confirmed,
    refuted,
    indeterminate,
    verifyPath,
  });
}
