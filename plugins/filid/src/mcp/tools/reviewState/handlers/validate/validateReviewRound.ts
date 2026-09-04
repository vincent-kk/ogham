import {
  readUtf8FileIfExistsSync,
  writeFileAtomicallySync,
} from '@ogham/cross-platform';

import {
  REVIEW_STATE_DIAGNOSTIC_CODES,
  REVIEW_STATE_DIAGNOSTIC_MESSAGES,
  REVIEW_STATE_JSON_INDENT,
  REVIEW_STATE_JSON_TRAILING_NEWLINE,
  REVIEW_VALIDATE_KINDS,
} from '../../../../../constants/reviewState.js';
import { TOOL_STATUSES } from '../../../../../constants/toolEnvelope.js';
import { renderOpinionSkeleton } from '../../brief/renderOpinionSkeleton.js';
import { renderVerifyBrief } from '../../brief/renderVerifyBrief.js';
import { computeReviewArtifactHash } from '../../hash/computeReviewArtifactHash.js';
import { checkReviewOpinion } from '../../opinion/checkReviewOpinion.js';
import { mergeReviewRounds } from '../../opinion/mergeReviewRounds.js';
import { parseReviewOpinion } from '../../opinion/parseReviewOpinion.js';
import type { ReviewOpinion } from '../../opinion/reviewOpinionTypes.js';
import type {
  ReviewValidatePayload,
  ReviewValidationProblem,
} from '../../state/reviewStateTypes.js';
import { writeReviewState } from '../../state/writeReviewState.js';

import { createValidatePayload } from './createValidatePayload.js';
import { locateReviewFindings } from './locateReviewFindings.js';
import { resolveReviewArtifactPath } from './resolveReviewArtifactPath.js';
import { rebuildPriorReviewOpinion } from './utils/rebuildPriorReviewOpinion.js';
import type { ValidateOpinionContext } from './validationHandlerTypes.js';

/**
 * Validate, locate, merge, and persist one reviewer round.
 *
 * @param context Prepared state, selected group, paths, and validated request.
 * @returns Validation problems or the next deterministic reviewer handoff.
 */
export async function validateReviewRound(
  context: ValidateOpinionContext,
): Promise<ReviewValidatePayload> {
  const { input, paths, state, group } = context;
  const round = input.round!;
  let prior: ReviewOpinion | null = null;
  if (round > 1) {
    const priorValidation = group.validated.review;
    const revalidatingCompletedRound =
      priorValidation?.round === round && priorValidation.complete;
    if (revalidatingCompletedRound)
      prior = await rebuildPriorReviewOpinion({
        projectRoot: input.projectRoot,
        paths,
        state,
        group,
        round,
      });
    else {
      if (
        !priorValidation ||
        priorValidation.round !== round - 1 ||
        priorValidation.complete
      )
        throw new Error(`review round is out of order for group ${group.id}`);
      const priorPath = resolveReviewArtifactPath(paths, group.opinionPath);
      const priorBytes = readUtf8FileIfExistsSync(priorPath);
      if (
        priorBytes === null ||
        computeReviewArtifactHash(priorBytes) !== priorValidation.sha256
      )
        throw new Error(`review round is out of order for group ${group.id}`);
      const priorParsed = parseReviewOpinion(priorBytes);
      if (priorParsed.opinion === null)
        throw new Error(`validated review opinion is invalid for ${group.id}`);
      const priorProblems: ReviewValidationProblem[] = [];
      if (
        !checkReviewOpinion(
          priorParsed.opinion,
          {
            group: group.id,
            round: round - 1,
            sourceHash: state.sourceHash,
            units: group.units,
          },
          priorProblems,
        )
      )
        throw new Error(`validated review opinion is invalid for ${group.id}`);
      prior = priorParsed.opinion;
    }
  }

  const opinionPath = resolveReviewArtifactPath(paths, group.opinionPath);
  const verifyBriefPath = resolveReviewArtifactPath(
    paths,
    group.verifyBriefPath,
  );
  const roundPath = resolveReviewArtifactPath(
    paths,
    `opinions/review-${group.id}.r${String(round)}.json`,
  );
  const content = readUtf8FileIfExistsSync(roundPath);
  if (content === null)
    return createValidatePayload({
      action: input.action,
      paths,
      status: TOOL_STATUSES.INDETERMINATE,
      kind: REVIEW_VALIDATE_KINDS.REVIEW,
      group: input.group,
      problems: [],
      round,
      ok: false,
      problemCount: 0,
      findings: 0,
      newFindings: 0,
      nextRound: null,
      diagnostics: [
        {
          code: REVIEW_STATE_DIAGNOSTIC_CODES.OPINION_INVALID,
          message: REVIEW_STATE_DIAGNOSTIC_MESSAGES.OPINION_INVALID,
          path: roundPath,
        },
      ],
      opinionPath,
      verifyBriefPath,
    });

  const parsed = parseReviewOpinion(content);
  const problems: ReviewValidationProblem[] =
    parsed.opinion === null ? [...parsed.problems] : [];
  let checkedOpinion: ReviewOpinion | null = null;
  if (
    parsed.opinion !== null &&
    checkReviewOpinion(
      parsed.opinion,
      {
        group: group.id,
        round,
        sourceHash: state.sourceHash,
        units: group.units,
      },
      problems,
    )
  )
    checkedOpinion = parsed.opinion;
  if (checkedOpinion === null)
    return createValidatePayload({
      action: input.action,
      paths,
      status: TOOL_STATUSES.OK,
      kind: REVIEW_VALIDATE_KINDS.REVIEW,
      group: input.group,
      problems,
      round,
      ok: false,
      problemCount: problems.length,
      findings: parsed.opinion?.findings.length ?? 0,
      newFindings: 0,
      nextRound: null,
      opinionPath,
      verifyBriefPath,
    });

  const current: ReviewOpinion = {
    ...checkedOpinion,
    findings: await locateReviewFindings(
      input.projectRoot,
      checkedOpinion.findings,
      group.units,
    ),
  };
  const merged = mergeReviewRounds(prior, current);
  const mergedBytes = `${JSON.stringify(
    merged.opinion,
    null,
    REVIEW_STATE_JSON_INDENT,
  )}${REVIEW_STATE_JSON_TRAILING_NEWLINE}`;
  const nextRound =
    round < group.rounds && merged.newFindings > 0 ? round + 1 : null;
  const candidates = state.scope.candidates.filter((candidate) =>
    group.candidateIds.includes(candidate.id),
  );
  writeFileAtomicallySync(opinionPath, mergedBytes);
  if (nextRound !== null)
    writeFileAtomicallySync(
      resolveReviewArtifactPath(
        paths,
        `opinions/review-${group.id}.r${String(nextRound)}.json`,
      ),
      renderOpinionSkeleton(group, state.sourceHash, nextRound),
    );
  writeFileAtomicallySync(
    verifyBriefPath,
    renderVerifyBrief({
      group,
      files: state.scope.files,
      findings: merged.opinion.findings,
      candidates,
      sourceHash: state.sourceHash,
    }),
  );
  const updatedState = {
    ...state,
    groups: state.groups.map((candidateGroup) =>
      candidateGroup.id === group.id
        ? {
            ...candidateGroup,
            validated: {
              review: {
                round,
                sha256: computeReviewArtifactHash(mergedBytes),
                complete: nextRound === null,
              },
              verify: null,
            },
          }
        : candidateGroup,
    ),
  };
  writeReviewState(paths.statePath, updatedState);
  return createValidatePayload({
    action: input.action,
    paths,
    status: TOOL_STATUSES.OK,
    kind: REVIEW_VALIDATE_KINDS.REVIEW,
    group: input.group,
    problems: [],
    round,
    ok: true,
    problemCount: 0,
    findings: merged.opinion.findings.length,
    newFindings: merged.newFindings,
    nextRound,
    opinionPath,
    verifyBriefPath,
  });
}
