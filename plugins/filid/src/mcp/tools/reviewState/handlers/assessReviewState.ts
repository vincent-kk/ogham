import { portableJoin } from '@ogham/cross-platform/compat/join';

import type { REVIEW_STATE_ACTIONS } from '../../../../constants/reviewState.js';
import {
  REVIEW_STATE_ACTIONS as ACTIONS,
  REVIEW_STATE_FILE_NAMES,
  REVIEW_STATE_GIT_ARGUMENTS,
} from '../../../../constants/reviewState.js';
import { TOOL_STATUSES } from '../../../../constants/toolEnvelope.js';
import { loadConfig } from '../../../../core/index.js';
import { classifyWorktreePaths } from '../assess/classifyWorktreePaths.js';
import { parseGitStatusPaths } from '../assess/parseGitStatusPaths.js';
import { readUnpushedCommits } from '../assess/readUnpushedCommits.js';
import { resolveBaseRef } from '../assess/resolveBaseRef.js';
import { resolveEntryStage } from '../assess/resolveEntryStage.js';
import { executeReviewGit } from '../hash/executeReviewGit.js';
import { assertReviewStatePaths } from '../state/assertReviewStatePaths.js';
import { resolveReviewStatePaths } from '../state/resolveReviewStatePaths.js';
import { reviewReportExists } from '../state/reviewReportExists.js';
import type {
  ReviewStateInput,
  ReviewStatePayload,
} from '../state/reviewStateTypes.js';

type AssessInput = Extract<
  ReviewStateInput,
  { action: typeof REVIEW_STATE_ACTIONS.ASSESS }
> & {
  /** Whether a pull request exists; the caller owns PR lookups, not this tool. */
  hasPullRequest?: boolean;
};

/**
 * Observe where a merge-track cycle stands: how the dirty worktree classifies,
 * which stage to resume at, the base ref and how far ahead of upstream HEAD is.
 * @param input Project root, branch, optional base ref and PR presence.
 * @returns Facts only — the caller decides what to stop on.
 */
export async function assessReviewState(
  input: AssessInput,
): Promise<ReviewStatePayload> {
  const paths = resolveReviewStatePaths(input.projectRoot, input.branchName);
  assertReviewStatePaths(paths);
  const generatedPaths =
    loadConfig(input.projectRoot).config?.structure?.generatedPaths ?? [];
  const status = await executeReviewGit(input.projectRoot, [
    ...REVIEW_STATE_GIT_ARGUMENTS.STATUS_PORCELAIN,
  ]);
  const worktree = classifyWorktreePaths(
    parseGitStatusPaths(status),
    generatedPaths,
  );
  const [baseRef, unpushedCommits] = await Promise.all([
    resolveBaseRef(input.projectRoot, input.baseRef),
    readUnpushedCommits(input.projectRoot),
  ]);
  const entryStage = resolveEntryStage({
    hasReValidate: reviewReportExists(
      portableJoin(paths.reviewDirectory, REVIEW_STATE_FILE_NAMES.RE_VALIDATE),
    ),
    hasJustifications: reviewReportExists(
      portableJoin(
        paths.reviewDirectory,
        REVIEW_STATE_FILE_NAMES.JUSTIFICATIONS,
      ),
    ),
    hasFixRequests: reviewReportExists(
      portableJoin(paths.reviewDirectory, REVIEW_STATE_FILE_NAMES.FIX_REQUESTS),
    ),
    hasPullRequest: input.hasPullRequest === true,
  });

  return {
    projectRoot: input.projectRoot,
    status: TOOL_STATUSES.OK,
    summary: {
      action: ACTIONS.ASSESS,
      entryStage,
      worktreeDisposition: worktree.disposition,
      baseRef,
      unpushedCommits,
      dirtyPathCount:
        worktree.documents.length +
        worktree.generated.length +
        worktree.source.length,
    },
    data: {
      reviewDirectory: paths.reviewDirectory,
      statePath: paths.statePath,
      assessment: { worktree, entryStage, baseRef, unpushedCommits },
    },
    diagnostics: [],
  };
}
