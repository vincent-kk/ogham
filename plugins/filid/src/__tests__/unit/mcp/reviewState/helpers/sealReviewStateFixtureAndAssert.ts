import { statSync } from 'node:fs';

import {
  readUtf8FileIfExistsSync,
  resolveContainedPath,
} from '@ogham/cross-platform';
import { expect } from 'vitest';

import {
  REVIEW_STATE_ACTIONS,
  REVIEW_STATE_DISPOSITIONS,
  REVIEW_STATE_FILE_NAMES,
  REVIEW_STATE_PHASES,
} from '../../../../../constants/reviewState.js';
import { handleReviewState } from '../../../../../mcp/tools/reviewState/index.js';
import type {
  ReviewSealPayload,
  ReviewStatePayload,
  ReviewStateRecord,
} from '../../../../../mcp/tools/reviewState/state/reviewStateTypes.js';

import type { ReviewStateSealFixture } from './createReviewStateSealFixture.js';

/** Expected fold counts and artifact choice for one successful seal. */
export interface ExpectedReviewStateSeal {
  /** Final deterministic verdict. */
  verdict: NonNullable<ReviewStateRecord['verdict']>;
  /** Roster paths whose assigned units were fully reviewed. */
  filesReviewed: number;
  /** Roster paths skipped deterministically during prepare. */
  filesSkipped: number;
  /** Candidate decisions confirmed by trusted verification. */
  confirmed: number;
  /** Candidate decisions refuted by trusted verification. */
  refuted: number;
  /** Candidate decisions left indeterminate by trusted verification. */
  indeterminate: number;
  /** Whether the verdict requires a canonical fix-request artifact. */
  hasFixRequests: boolean;
}

/**
 * Seal one prepared fixture and assert the shared v7 response and write order.
 *
 * @param fixture Temporary repository and branch identity.
 * @param state Latest persisted validation state before seal.
 * @param expected Expected verdict, coverage, decision counts, and artifacts.
 * @returns Successful payload returned by the real seal action.
 */
export async function sealReviewStateFixtureAndAssert(
  fixture: ReviewStateSealFixture,
  state: ReviewStateRecord,
  expected: ExpectedReviewStateSeal,
): Promise<ReviewSealPayload | ReviewStatePayload> {
  const reviewDirectory = resolveContainedPath(
    state.projectRoot,
    '.filid/review',
    state.normalizedBranch,
  );
  const statePath = resolveContainedPath(
    reviewDirectory,
    REVIEW_STATE_FILE_NAMES.STATE,
  );
  const reportPath = resolveContainedPath(
    reviewDirectory,
    REVIEW_STATE_FILE_NAMES.REPORT,
  );
  const fixRequestsPath = resolveContainedPath(
    reviewDirectory,
    REVIEW_STATE_FILE_NAMES.FIX_REQUESTS,
  );
  const prCommentPath = resolveContainedPath(
    reviewDirectory,
    REVIEW_STATE_FILE_NAMES.PR_COMMENT,
  );
  const sessionPath = resolveContainedPath(
    reviewDirectory,
    REVIEW_STATE_FILE_NAMES.SESSION,
  );
  expect(readUtf8FileIfExistsSync(reportPath)).toBeNull();
  expect(readUtf8FileIfExistsSync(prCommentPath)).toBeNull();
  expect(JSON.parse(readUtf8FileIfExistsSync(statePath) ?? '{}')).toMatchObject(
    { phase: REVIEW_STATE_PHASES.PREPARED, verdict: null },
  );

  const sealed = await handleReviewState({
    action: REVIEW_STATE_ACTIONS.SEAL,
    projectRoot: fixture.projectRoot,
    branchName: fixture.branchName,
  });

  expect(sealed.status).toBe('ok');
  expect(sealed.summary).toMatchObject({
    action: REVIEW_STATE_ACTIONS.SEAL,
    disposition: REVIEW_STATE_DISPOSITIONS.SEALED,
    verdict: expected.verdict,
    filesTotal: 2,
    filesReviewed: expected.filesReviewed,
    filesSkipped: expected.filesSkipped,
    confirmed: expected.confirmed,
    refuted: expected.refuted,
    indeterminate: expected.indeterminate,
  });
  expect(Object.keys(sealed.summary).sort()).toEqual(
    [
      'action',
      'confirmed',
      'disposition',
      'filesReviewed',
      'filesSkipped',
      'filesTotal',
      'indeterminate',
      'refuted',
      'verdict',
    ].sort(),
  );
  expect(sealed.data).toMatchObject({
    reportPath,
    fixRequestsPath: expected.hasFixRequests ? fixRequestsPath : null,
    prCommentPath,
    sessionPath,
  });
  expect(Object.keys(sealed.data).sort()).toEqual(
    ['fixRequestsPath', 'prCommentPath', 'reportPath', 'sessionPath'].sort(),
  );
  const report = readUtf8FileIfExistsSync(reportPath);
  const prComment = readUtf8FileIfExistsSync(prCommentPath);
  const session = readUtf8FileIfExistsSync(sessionPath);
  expect(report).toContain(`## Final Verdict`);
  expect(report).toContain(expected.verdict);
  expect(prComment).toContain(
    `## Code Review Governance — ${expected.verdict}`,
  );
  expect(session?.match(/^\| src\/value\.ts \| M \|/gmu)).toHaveLength(1);
  expect(session?.match(/^\| yarn\.lock \| M \|/gmu)).toHaveLength(1);
  expect(readUtf8FileIfExistsSync(fixRequestsPath) !== null).toBe(
    expected.hasFixRequests,
  );
  const persisted = JSON.parse(
    readUtf8FileIfExistsSync(statePath) ?? '{}',
  ) as ReviewStateRecord;
  expect(persisted).toMatchObject({
    phase: REVIEW_STATE_PHASES.SEALED,
    verdict: expected.verdict,
  });
  const stateMtime = statSync(statePath, { bigint: true }).mtimeNs;
  expect(statSync(reportPath, { bigint: true }).mtimeNs).toBeLessThanOrEqual(
    stateMtime,
  );
  expect(statSync(prCommentPath, { bigint: true }).mtimeNs).toBeLessThanOrEqual(
    stateMtime,
  );
  expect(statSync(sessionPath, { bigint: true }).mtimeNs).toBeLessThanOrEqual(
    stateMtime,
  );
  return sealed;
}
