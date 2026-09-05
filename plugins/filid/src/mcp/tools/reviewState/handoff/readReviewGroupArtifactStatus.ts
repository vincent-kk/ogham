import { existsSync, readdirSync } from 'node:fs';

import { readUtf8FileIfExistsSync } from '@ogham/cross-platform';

import { computeReviewArtifactHash } from '../hash/computeReviewArtifactHash.js';
import { checkReviewOpinion } from '../opinion/checkReviewOpinion.js';
import { parseReviewOpinion } from '../opinion/parseReviewOpinion.js';
import { splitVerifierAssignment } from '../opinion/splitVerifierAssignment.js';
import { resolveReviewArtifactPath } from '../state/resolveReviewArtifactPath.js';
import type {
  ReviewStatePaths,
  ReviewStateRecord,
} from '../state/reviewStateTypes.js';

import type {
  ReviewArtifactTrust,
  ReviewGroupArtifactStatus,
} from './handoffTypes.js';

/**
 * Read each group's exact artifact bytes and normalize their validation trust.
 * @param state Prepared groups whose stored hashes define trusted artifacts.
 * @param paths Contained branch artifact paths; symlinked targets are rejected.
 * @returns Group-ordered trust, round presence, and independent assignment facts.
 * @throws When an artifact path violates containment or cannot be read.
 */
export function readReviewGroupArtifactStatus(
  state: ReviewStateRecord,
  paths: ReviewStatePaths,
): ReviewGroupArtifactStatus[] {
  const opinionsDirectory = resolveReviewArtifactPath(paths, 'opinions');
  const names = existsSync(opinionsDirectory)
    ? readdirSync(opinionsDirectory)
    : [];
  return state.groups.map((group) => {
    const reviewBytes = readUtf8FileIfExistsSync(
      resolveReviewArtifactPath(paths, group.opinionPath),
    );
    const verifyBytes = readUtf8FileIfExistsSync(
      resolveReviewArtifactPath(paths, group.verifyPath),
    );
    const validation = group.validated.review;
    let review: ReviewArtifactTrust =
      validation === null ? 'missing' : 'invalid';
    let assignedCount: number | null = null;
    if (
      validation &&
      reviewBytes !== null &&
      computeReviewArtifactHash(reviewBytes) === validation.sha256
    ) {
      const parsed = parseReviewOpinion(reviewBytes);
      if (
        parsed.opinion &&
        checkReviewOpinion(
          parsed.opinion,
          {
            group: group.id,
            round: validation.round,
            sourceHash: state.sourceHash,
            units: group.units,
          },
          [],
        )
      ) {
        review = 'trusted';
        assignedCount = splitVerifierAssignment(parsed.opinion.findings)
          .assigned.length;
      }
    }
    const verify = group.validated.verify;
    const roundPattern = new RegExp(
      `^review-${group.id}\\.r([1-9]\\d*)\\.json$`,
    );
    return {
      group: group.id,
      review,
      verify:
        verify === null
          ? 'missing'
          : verifyBytes !== null &&
              computeReviewArtifactHash(verifyBytes) === verify.sha256 &&
              verify.reviewSha256 === validation?.sha256
            ? 'trusted'
            : 'invalid',
      roundFiles: names
        .flatMap((name) => {
          const match = name.match(roundPattern);
          if (!match) return [];
          // Guard discovered round files even though only their numbers are returned.
          resolveReviewArtifactPath(paths, `opinions/${name}`);
          return [Number(match[1])];
        })
        .sort((a, b) => a - b),
      assignedCount,
      briefPresent: existsSync(
        resolveReviewArtifactPath(paths, group.briefPath),
      ),
      verifyBriefPresent: existsSync(
        resolveReviewArtifactPath(paths, group.verifyBriefPath),
      ),
    };
  });
}
