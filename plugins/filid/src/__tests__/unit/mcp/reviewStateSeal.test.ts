import { createHash } from 'node:crypto';
import { rmSync } from 'node:fs';

import {
  readUtf8FileIfExistsSync,
  resolveContainedPath,
  writeFileAtomicallySync,
} from '@ogham/cross-platform';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  REVIEW_STATE_ACTIONS,
  REVIEW_STATE_FILE_NAMES,
  REVIEW_VALIDATE_KINDS,
} from '../../../constants/reviewState.js';
import { handleReviewState } from '../../../mcp/tools/reviewState/index.js';
import type { ReviewStateRecord } from '../../../mcp/tools/reviewState/state/reviewStateTypes.js';

import { buildReviewOpinion } from './reviewState/helpers/buildReviewOpinion.js';
import { buildReviewStateSealFinding } from './reviewState/helpers/buildReviewStateSealFinding.js';
import {
  type ReviewStateSealFixture,
  createReviewStateSealFixture,
} from './reviewState/helpers/createReviewStateSealFixture.js';
import { prepareReviewStateSealFixture } from './reviewState/helpers/prepareReviewStateSealFixture.js';
import { readPersistedReviewState } from './reviewState/helpers/readPersistedReviewState.js';
import { sealReviewStateFixtureAndAssert } from './reviewState/helpers/sealReviewStateFixtureAndAssert.js';
import { validateReviewStateSealGroup } from './reviewState/helpers/validateReviewStateSealGroup.js';

/** Temporary repository and plugin root used by the active case. */
let fixture: ReviewStateSealFixture;

/**
 * Resolve one review-directory-relative artifact in the fixture repository.
 *
 * @param projectRoot Absolute temporary repository root.
 * @param state Prepared state carrying the collision-safe branch directory.
 * @param relativePath Review-directory-relative artifact path.
 * @returns Absolute contained fixture artifact path.
 */
function reviewArtifactPath(
  projectRoot: string,
  state: ReviewStateRecord,
  relativePath: string,
): string {
  return resolveContainedPath(
    projectRoot,
    '.filid/review',
    state.normalizedBranch,
    relativePath,
  );
}

beforeEach(() => {
  fixture = createReviewStateSealFixture();
});

afterEach(() => {
  rmSync(fixture.projectRoot, { recursive: true, force: true });
  rmSync(fixture.pluginRoot, { recursive: true, force: true });
  if (fixture.originalPluginRoot === undefined)
    delete process.env.CLAUDE_PLUGIN_ROOT;
  else process.env.CLAUDE_PLUGIN_ROOT = fixture.originalPluginRoot;
});

describe('review_state seal v7', () => {
  it('renders and persists an APPROVED verdict from trusted empty findings', async () => {
    const state = await prepareReviewStateSealFixture(fixture);
    const group = state.groups[0];
    const validated = await validateReviewStateSealGroup({
      fixture,
      state,
      opinion: buildReviewOpinion(state, group),
      decisions: [],
    });

    await sealReviewStateFixtureAndAssert(fixture, validated, {
      verdict: 'APPROVED',
      filesReviewed: 1,
      filesSkipped: 1,
      confirmed: 0,
      refuted: 0,
      indeterminate: 0,
      hasFixRequests: false,
    });
  });

  it('restores the sealed response after opinion artifacts are mutated', async () => {
    const state = await prepareReviewStateSealFixture(fixture);
    const group = state.groups[0];
    const opinion = buildReviewOpinion(state, group);
    opinion.findings = [buildReviewStateSealFinding(group.id)];
    const validated = await validateReviewStateSealGroup({
      fixture,
      state,
      opinion,
      decisions: [
        {
          findingId: `R${group.id}-001`,
          verdict: 'CONFIRMED',
          evidence: 'src/value.ts:1',
          reason: 'The changed export reproduces the defect.',
        },
      ],
    });
    const first = await sealReviewStateFixtureAndAssert(fixture, validated, {
      verdict: 'REQUEST_CHANGES',
      filesReviewed: 1,
      filesSkipped: 1,
      confirmed: 1,
      refuted: 0,
      indeterminate: 0,
      hasFixRequests: true,
    });
    const report = readUtf8FileIfExistsSync(first.data.reportPath ?? '');
    const fixRequests = readUtf8FileIfExistsSync(
      first.data.fixRequestsPath ?? '',
    );
    const prComment = readUtf8FileIfExistsSync(first.data.prCommentPath ?? '');
    const session = readUtf8FileIfExistsSync(first.data.sessionPath ?? '');
    writeFileAtomicallySync(
      reviewArtifactPath(fixture.projectRoot, validated, group.opinionPath),
      'mutated after seal\n',
    );
    writeFileAtomicallySync(
      reviewArtifactPath(fixture.projectRoot, validated, group.verifyPath),
      'mutated after seal\n',
    );

    const repeated = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.SEAL,
      projectRoot: fixture.projectRoot,
      branchName: fixture.branchName,
    });

    expect(repeated.summary).toMatchObject({
      disposition: 'sealed',
      verdict: 'REQUEST_CHANGES',
      filesTotal: 2,
      filesReviewed: 1,
      filesSkipped: 1,
      confirmed: 1,
      refuted: 0,
      indeterminate: 0,
    });
    expect(repeated.data).toMatchObject({
      reportPath: first.data.reportPath,
      fixRequestsPath: first.data.fixRequestsPath,
      prCommentPath: first.data.prCommentPath,
      sessionPath: first.data.sessionPath,
    });
    expect(readUtf8FileIfExistsSync(first.data.reportPath ?? '')).toBe(report);
    expect(readUtf8FileIfExistsSync(first.data.fixRequestsPath ?? '')).toBe(
      fixRequests,
    );
    expect(readUtf8FileIfExistsSync(first.data.prCommentPath ?? '')).toBe(
      prComment,
    );
    expect(readUtf8FileIfExistsSync(first.data.sessionPath ?? '')).toBe(
      session,
    );
  });

  it('renders and persists REQUEST_CHANGES with canonical fix requests', async () => {
    const state = await prepareReviewStateSealFixture(fixture);
    const group = state.groups[0];
    const finding = buildReviewStateSealFinding(group.id);
    const opinion = buildReviewOpinion(state, group);
    opinion.findings = [finding];
    const validated = await validateReviewStateSealGroup({
      fixture,
      state,
      opinion,
      decisions: [
        {
          findingId: `R${group.id}-001`,
          verdict: 'CONFIRMED',
          evidence: 'src/value.ts:1',
          reason: 'The changed export reproduces the defect.',
        },
      ],
    });

    const sealed = await sealReviewStateFixtureAndAssert(fixture, validated, {
      verdict: 'REQUEST_CHANGES',
      filesReviewed: 1,
      filesSkipped: 1,
      confirmed: 1,
      refuted: 0,
      indeterminate: 0,
      hasFixRequests: true,
    });
    expect(
      readUtf8FileIfExistsSync(sealed.data.fixRequestsPath ?? ''),
    ).toContain('- **Claim**: The exported value is defective.');
  });

  it('renders and persists INCONCLUSIVE before a confirmed finding can win', async () => {
    const state = await prepareReviewStateSealFixture(fixture);
    const group = state.groups[0];
    const opinion = buildReviewOpinion(state, group);
    opinion.findings = [buildReviewStateSealFinding(group.id)];
    const validated = await validateReviewStateSealGroup({
      fixture,
      state,
      opinion,
      decisions: [
        {
          findingId: `R${group.id}-001`,
          verdict: 'INDETERMINATE',
          evidence: 'The reproduction environment is unavailable.',
          reason: 'The error-severity claim cannot be resolved independently.',
        },
      ],
    });

    await sealReviewStateFixtureAndAssert(fixture, validated, {
      verdict: 'INCONCLUSIVE',
      filesReviewed: 1,
      filesSkipped: 1,
      confirmed: 0,
      refuted: 0,
      indeterminate: 1,
      hasFixRequests: false,
    });
  });

  it('makes a reviewer opinion modified after validation inconclusive', async () => {
    const state = await prepareReviewStateSealFixture(fixture);
    const group = state.groups[0];
    const validated = await validateReviewStateSealGroup({
      fixture,
      state,
      opinion: buildReviewOpinion(state, group),
      decisions: [],
    });
    const opinionPath = reviewArtifactPath(
      fixture.projectRoot,
      validated,
      group.opinionPath,
    );
    writeFileAtomicallySync(
      opinionPath,
      `${readUtf8FileIfExistsSync(opinionPath) ?? ''}\n`,
    );

    const sealed = await sealReviewStateFixtureAndAssert(fixture, validated, {
      verdict: 'INCONCLUSIVE',
      filesReviewed: 0,
      filesSkipped: 1,
      confirmed: 0,
      refuted: 0,
      indeterminate: 0,
      hasFixRequests: false,
    });
    expect(readUtf8FileIfExistsSync(sealed.data.reportPath ?? '')).toContain(
      'artifact modified after validation',
    );
  });

  it('rejects a verifier bound to a superseded merged review hash', async () => {
    const state = await prepareReviewStateSealFixture(fixture);
    const group = state.groups[0];
    const validated = await validateReviewStateSealGroup({
      fixture,
      state,
      opinion: buildReviewOpinion(state, group),
      decisions: [],
    });
    const opinionPath = reviewArtifactPath(
      fixture.projectRoot,
      validated,
      group.opinionPath,
    );
    const opinion = JSON.parse(
      readUtf8FileIfExistsSync(opinionPath) ?? '{}',
    ) as Record<string, unknown>;
    const supersedingBytes = `${JSON.stringify(
      { ...opinion, riskPlan: 'Re-check the changed public contract.' },
      null,
      2,
    )}\n`;
    writeFileAtomicallySync(opinionPath, supersedingBytes);
    const supersedingHash = createHash('sha256')
      .update(supersedingBytes)
      .digest('hex');
    const patched: ReviewStateRecord = {
      ...validated,
      groups: validated.groups.map((candidate) =>
        candidate.id === group.id
          ? {
              ...candidate,
              validated: {
                ...candidate.validated,
                review: {
                  ...candidate.validated.review!,
                  sha256: supersedingHash,
                },
              },
            }
          : candidate,
      ),
    };
    writeFileAtomicallySync(
      reviewArtifactPath(
        fixture.projectRoot,
        validated,
        REVIEW_STATE_FILE_NAMES.STATE,
      ),
      `${JSON.stringify(patched, null, 2)}\n`,
    );

    const sealed = await sealReviewStateFixtureAndAssert(fixture, patched, {
      verdict: 'INCONCLUSIVE',
      filesReviewed: 0,
      filesSkipped: 1,
      confirmed: 0,
      refuted: 0,
      indeterminate: 0,
      hasFixRequests: false,
    });
    expect(readUtf8FileIfExistsSync(sealed.data.reportPath ?? '')).toContain(
      'verifier decided a superseded opinion',
    );
  });

  it('seals incomplete review rounds as INCONCLUSIVE evidence', async () => {
    const state = await prepareReviewStateSealFixture(fixture, 'medium');
    const group = state.groups[0];
    const opinion = buildReviewOpinion(state, group);
    opinion.findings = [buildReviewStateSealFinding(group.id)];
    writeFileAtomicallySync(
      reviewArtifactPath(
        fixture.projectRoot,
        state,
        `opinions/review-${group.id}.r1.json`,
      ),
      `${JSON.stringify(opinion)}\n`,
    );
    const reviewed = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.VALIDATE,
      projectRoot: fixture.projectRoot,
      branchName: fixture.branchName,
      kind: REVIEW_VALIDATE_KINDS.REVIEW,
      group: group.id,
      round: 1,
    });
    expect(reviewed.summary).toMatchObject({ ok: true, nextRound: 2 });
    const reviewedState = readPersistedReviewState(
      fixture.projectRoot,
      state.normalizedBranch,
    );
    expect(reviewedState.groups[0].validated.review?.complete).toBe(false);

    const sealed = await sealReviewStateFixtureAndAssert(
      fixture,
      reviewedState,
      {
        verdict: 'INCONCLUSIVE',
        filesReviewed: 0,
        filesSkipped: 1,
        confirmed: 0,
        refuted: 0,
        indeterminate: 0,
        hasFixRequests: false,
      },
    );
    expect(readUtf8FileIfExistsSync(sealed.data.reportPath ?? '')).toContain(
      'review rounds incomplete',
    );
  });

  it('seals a dirty prepared scope without reviewer opinions as INCONCLUSIVE', async () => {
    const state = await prepareReviewStateSealFixture(fixture);
    const dirtyState: ReviewStateRecord = {
      ...state,
      scope: {
        ...state.scope,
        worktree: 'source-dirty',
        dirtyPaths: ['src/value.ts'],
      },
    };
    writeFileAtomicallySync(
      reviewArtifactPath(
        fixture.projectRoot,
        state,
        REVIEW_STATE_FILE_NAMES.STATE,
      ),
      `${JSON.stringify(dirtyState, null, 2)}\n`,
    );

    const sealed = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.SEAL,
      projectRoot: fixture.projectRoot,
      branchName: fixture.branchName,
    });

    expect(sealed.status).toBe('ok');
    expect(sealed.summary).toMatchObject({
      disposition: 'sealed',
      verdict: 'INCONCLUSIVE',
      filesReviewed: 0,
    });
    expect(readUtf8FileIfExistsSync(sealed.data.reportPath ?? '')).toContain(
      'source-dirty',
    );
  });
});
