import {
  readUtf8FileIfExistsSync,
  writeFileAtomicallySync,
} from '@ogham/cross-platform';

import { REVIEW_OPINION_SCHEMA_VERSION } from '../../../../../constants/reviewState.js';
import { computeReviewArtifactHash } from '../../hash/computeReviewArtifactHash.js';
import { resolveReviewArtifactPath } from '../../state/resolveReviewArtifactPath.js';
import type { ReviewGroup } from '../../state/reviewGroupTypes.js';
import type { ReviewStatePaths } from '../../state/reviewStateTypes.js';

/**
 * Write a canonical empty review and retain only matching validation bindings.
 * @param paths Contained artifact paths owned by the prepared session.
 * @param group Candidate-only group with no reviewable units.
 * @param sourceHash Committed source identity embedded in the opinion.
 * @param preserveOpinion Whether an existing opinion must survive ordinary resume.
 * @returns Group whose review and verify validations match the retained bytes.
 * @throws When a candidate-only group contains units or artifact paths are invalid.
 */
export function writeCandidateOnlyReviewOpinion(
  paths: ReviewStatePaths,
  group: ReviewGroup,
  sourceHash: string,
  preserveOpinion: boolean,
): ReviewGroup {
  if (group.units.length !== 0)
    throw new Error(`Candidate-only review group ${group.id} contains units`);
  const opinion = `${JSON.stringify(
    {
      schema: REVIEW_OPINION_SCHEMA_VERSION,
      group: group.id,
      round: 0,
      state: 'COMPLETE',
      sourceHash,
      files: [],
      findings: [],
      checked: group.candidateIds,
      gaps: [],
      riskPlan: null,
    },
    null,
    2,
  )}\n`;
  const opinionPath = resolveReviewArtifactPath(paths, group.opinionPath);
  let persistedOpinion = readUtf8FileIfExistsSync(opinionPath);
  if (!preserveOpinion || persistedOpinion === null) {
    writeFileAtomicallySync(opinionPath, opinion);
    persistedOpinion = opinion;
  }
  const sha256 = computeReviewArtifactHash(persistedOpinion);
  const expectedOpinion = persistedOpinion === opinion;
  const retainedOpinion =
    group.validated.review?.complete === true &&
    group.validated.review.round === 0 &&
    group.validated.review.sha256 === sha256;
  const persistedVerify = readUtf8FileIfExistsSync(
    resolveReviewArtifactPath(paths, group.verifyPath),
  );
  const priorVerify = group.validated.verify;
  const retainedVerify =
    retainedOpinion &&
    persistedVerify !== null &&
    priorVerify?.reviewSha256 === sha256 &&
    priorVerify.sha256 === computeReviewArtifactHash(persistedVerify);
  return {
    ...group,
    validated: {
      review:
        expectedOpinion || retainedOpinion
          ? { round: 0, sha256, complete: true }
          : null,
      verify: retainedVerify && priorVerify ? { ...priorVerify } : null,
    },
  };
}
