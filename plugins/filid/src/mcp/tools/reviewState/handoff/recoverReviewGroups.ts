import { existsSync } from 'node:fs';

import {
  readUtf8FileIfExistsSync,
  removeFileIfExistsSync,
  writeFileAtomicallySync,
} from '@ogham/cross-platform';

import { renderOpinionSkeleton } from '../brief/renderOpinionSkeleton.js';
import { renderVerifyBrief } from '../brief/renderVerifyBrief.js';
import { readInlineReviewDiffs } from '../diff/readInlineReviewDiffs.js';
import { checkReviewOpinion } from '../opinion/checkReviewOpinion.js';
import { parseReviewOpinion } from '../opinion/parseReviewOpinion.js';
import { loadActorMethods } from '../rules/loadActorMethods.js';
import { resolveReviewArtifactPath } from '../state/resolveReviewArtifactPath.js';
import type {
  ReviewStatePaths,
  ReviewStateRecord,
} from '../state/reviewStateTypes.js';
import { writeReviewState } from '../state/writeReviewState.js';

import { readReviewGroupArtifactStatus } from './readReviewGroupArtifactStatus.js';
import { rebuildReviewGroup } from './utils/rebuildReviewGroup.js';
import { writeAutoVerifyOpinion } from './utils/writeAutoVerifyOpinion.js';
import { writeCandidateOnlyReviewOpinion } from './utils/writeCandidateOnlyReviewOpinion.js';

/**
 * Repair resumable groups before trust is observed for the next handoff plan.
 * @param initial Prepared state after missing diffs and reviewer briefs are written.
 * @param paths Contained canonical artifacts owned by this branch review.
 * @param pluginRoot Resolved actor-method root, read only when a brief is missing.
 * @returns Recovered state, atomically persisted after the recovery effects.
 * @throws When stored raw rounds cannot be validated or paths cannot be read.
 */
export async function recoverReviewGroups(
  initial: ReviewStateRecord,
  paths: ReviewStatePaths,
  pluginRoot: string | null,
): Promise<ReviewStateRecord> {
  let state = initial;
  for (const observed of readReviewGroupArtifactStatus(state, paths)) {
    let group = state.groups.find(({ id }) => id === observed.group)!;
    if (group.rounds === 0 && observed.review !== 'trusted')
      group = writeCandidateOnlyReviewOpinion(
        paths,
        group,
        state.sourceHash,
        false,
      );
    else if (observed.review === 'invalid') {
      const lastRound = group.validated.review!.round;
      const completePrefix = Array.from(
        { length: lastRound },
        (_, index) => index + 1,
      ).every((round) => observed.roundFiles.includes(round));
      if (completePrefix) {
        state = await rebuildReviewGroup(
          state,
          paths,
          group,
          observed.roundFiles,
        );
        group = state.groups.find(({ id }) => id === group.id)!;
      } else {
        group = { ...group, validated: { review: null, verify: null } };
        removeFileIfExistsSync(
          resolveReviewArtifactPath(paths, group.opinionPath),
        );
        writeFileAtomicallySync(
          resolveReviewArtifactPath(paths, group.skeletonPath),
          renderOpinionSkeleton(group, state.sourceHash, 1),
        );
      }
    }

    const status = readReviewGroupArtifactStatus(
      { ...state, groups: [group] },
      paths,
    )[0]!;
    if (status.verify === 'invalid')
      group = { ...group, validated: { ...group.validated, verify: null } };
    if (
      group.rounds > 0 &&
      (status.review === 'missing' ||
        group.validated.review?.complete === false)
    ) {
      const round =
        status.review === 'missing' ? 1 : group.validated.review!.round + 1;
      const path = resolveReviewArtifactPath(
        paths,
        `opinions/review-${group.id}.r${round}.json`,
      );
      if (!existsSync(path))
        writeFileAtomicallySync(
          path,
          renderOpinionSkeleton(group, state.sourceHash, round),
        );
    }
    if (
      status.review === 'trusted' &&
      group.validated.review?.complete &&
      status.verify !== 'trusted'
    )
      if (status.assignedCount === 0)
        group = writeAutoVerifyOpinion(paths, group, state.sourceHash);
      else if (!status.verifyBriefPresent) {
        const bytes = readUtf8FileIfExistsSync(
          resolveReviewArtifactPath(paths, group.opinionPath),
        )!;
        const parsed = parseReviewOpinion(bytes);
        if (
          !parsed.opinion ||
          !checkReviewOpinion(
            parsed.opinion,
            {
              group: group.id,
              round: group.validated.review.round,
              sourceHash: state.sourceHash,
              units: group.units,
            },
            [],
          )
        )
          throw new Error(
            `Trusted review could not be rendered for ${group.id}`,
          );
        writeFileAtomicallySync(
          resolveReviewArtifactPath(paths, group.verifyBriefPath),
          renderVerifyBrief({
            group,
            files: state.scope.files,
            findings: parsed.opinion.findings,
            sourceHash: state.sourceHash,
            verifierMethod: loadActorMethods(pluginRoot).verifier,
            diffs: readInlineReviewDiffs(paths, group),
          }),
        );
      }

    state = {
      ...state,
      groups: state.groups.map((item) => (item.id === group.id ? group : item)),
    };
  }
  writeReviewState(paths.statePath, state);
  return state;
}
