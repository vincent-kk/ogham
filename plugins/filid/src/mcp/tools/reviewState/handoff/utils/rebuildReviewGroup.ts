import {
  readUtf8FileIfExistsSync,
  writeFileAtomicallySync,
} from '@ogham/cross-platform';

import { REVIEW_STATE_DIAGNOSTIC_CODES } from '../../../../../constants/reviewState.js';
import { ToolDiagnosticError } from '../../../../errors/toolDiagnosticError.js';
import { validateReviewRound } from '../../handlers/validate/validateReviewRound.js';
import { readReviewState } from '../../state/readReviewState.js';
import { resolveReviewArtifactPath } from '../../state/resolveReviewArtifactPath.js';
import type { ReviewGroup } from '../../state/reviewGroupTypes.js';
import type {
  ReviewStatePaths,
  ReviewStateRecord,
} from '../../state/reviewStateTypes.js';

/**
 * Replay validated raw rounds while preserving raw drafts and existing verifier bytes.
 * @param state Prepared state before recovery, including the prior verify binding.
 * @param paths Contained paths used by the existing validation effect boundary.
 * @param group Invalid merged review whose complete raw prefix is available.
 * @param roundFiles Existing raw rounds, including any unvalidated later draft.
 * @returns State with a rebuilt merged review and the prior verify hash binding.
 * @throws When a raw round cannot be read or no longer satisfies validation.
 */
export async function rebuildReviewGroup(
  state: ReviewStateRecord,
  paths: ReviewStatePaths,
  group: ReviewGroup,
  roundFiles: readonly number[],
): Promise<ReviewStateRecord> {
  const verifyPath = resolveReviewArtifactPath(paths, group.verifyPath);
  const verifyBytes = readUtf8FileIfExistsSync(verifyPath);
  const saved = new Map(
    roundFiles.map((round) => {
      const path = resolveReviewArtifactPath(
        paths,
        `opinions/review-${group.id}.r${round}.json`,
      );
      const bytes = readUtf8FileIfExistsSync(path);
      if (bytes === null)
        throw new Error(`Review round disappeared during recovery: ${path}`);
      return [round, { path, bytes }] as const;
    }),
  );
  let replayed: ReviewStateRecord = {
    ...state,
    groups: state.groups.map((item) =>
      item.id === group.id
        ? { ...item, validated: { review: null, verify: null } }
        : item,
    ),
  };
  try {
    for (let round = 1; round <= group.validated.review!.round; round += 1) {
      const raw = saved.get(round)!;
      writeFileAtomicallySync(raw.path, raw.bytes);
      const current = replayed.groups.find(({ id }) => id === group.id)!;
      const result = await validateReviewRound({
        input: {
          action: 'validate',
          projectRoot: state.projectRoot,
          branchName: state.branchName,
          kind: 'review',
          group: group.id,
          round,
        },
        state: replayed,
        paths,
        group: current,
      });
      if (!result.summary.ok)
        throw new ToolDiagnosticError(
          REVIEW_STATE_DIAGNOSTIC_CODES.OPINION_INVALID,
          `Cannot recover invalid raw review round ${round} for group ${group.id}.`,
        );
      const persisted = readReviewState(paths.statePath);
      if (persisted === null || 'kind' in persisted)
        throw new Error('Review state disappeared during round recovery.');
      replayed = persisted;
    }
  } finally {
    for (const { path, bytes } of saved.values())
      writeFileAtomicallySync(path, bytes);
    if (verifyBytes !== null) writeFileAtomicallySync(verifyPath, verifyBytes);
  }
  return {
    ...replayed,
    groups: replayed.groups.map((item) =>
      item.id === group.id
        ? {
            ...item,
            validated: {
              review: item.validated.review,
              verify: group.validated.verify,
            },
          }
        : item,
    ),
  };
}
