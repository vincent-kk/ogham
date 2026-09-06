import { rmSync } from 'node:fs';

import { readUtf8FileIfExistsSync } from '@ogham/cross-platform';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { REVIEW_STATE_ACTIONS } from '../../../constants/reviewState.js';
import { handleReviewState } from '../../../mcp/tools/reviewState/index.js';

import { buildReviewOpinion } from './reviewState/helpers/buildReviewOpinion.js';
import {
  type ReviewStateSealFixture,
  createReviewStateSealFixture,
} from './reviewState/helpers/createReviewStateSealFixture.js';
import { readPreparedReviewState } from './reviewState/helpers/readPreparedReviewState.js';
import { resolveReviewStateFixtureArtifact } from './reviewState/helpers/resolveReviewStateFixtureArtifact.js';
import { roundReviewOpinionPath } from './reviewState/helpers/roundReviewOpinionPath.js';
import { writeReviewStateFixtureJson } from './reviewState/helpers/writeReviewStateFixtureJson.js';

/** Temporary Git repository and plugin root used by effort-skeleton cases. */
let fixture: ReviewStateSealFixture;

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

describe('review_state prepare effort skeleton', () => {
  it('rejects raised effort without creating a next-round skeleton', async () => {
    const prepared = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot: fixture.projectRoot,
      branchName: fixture.branchName,
      baseRef: 'main',
      effort: 'medium',
    });
    const mediumState = readPreparedReviewState(prepared);
    const mediumGroup = mediumState.groups[0];
    if (!mediumGroup) throw new Error('Expected one prepared review group');
    writeReviewStateFixtureJson(
      fixture.projectRoot,
      mediumState,
      roundReviewOpinionPath(mediumGroup.id, 1),
      buildReviewOpinion(mediumState, mediumGroup),
    );
    const validated = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.VALIDATE,
      projectRoot: fixture.projectRoot,
      branchName: fixture.branchName,
      kind: 'review',
      group: mediumGroup.id,
      round: 1,
    });
    expect(validated.summary).toMatchObject({ nextRound: null });
    const opinionPath = resolveReviewStateFixtureArtifact(
      fixture.projectRoot,
      mediumState.normalizedBranch,
      mediumGroup.opinionPath,
    );
    const opinionBefore = readUtf8FileIfExistsSync(opinionPath);

    await expect(
      handleReviewState({
        action: REVIEW_STATE_ACTIONS.PREPARE,
        projectRoot: fixture.projectRoot,
        branchName: fixture.branchName,
        baseRef: 'main',
        effort: 'high',
      }),
    ).rejects.toMatchObject({ code: 'review-effort-locked' });
    const resumed = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot: fixture.projectRoot,
      effort: 'medium',
    });

    const resumedState = readPreparedReviewState(resumed);
    const resumedGroup = resumedState.groups[0];
    if (!resumedGroup) throw new Error('Expected one resumed review group');
    const roundTwoPath = resolveReviewStateFixtureArtifact(
      fixture.projectRoot,
      resumedState.normalizedBranch,
      roundReviewOpinionPath(resumedGroup.id, 2),
    );
    const briefPath = resolveReviewStateFixtureArtifact(
      fixture.projectRoot,
      resumedState.normalizedBranch,
      resumedGroup.briefPath,
    );

    expect(readUtf8FileIfExistsSync(roundTwoPath)).toBeNull();
    expect(readUtf8FileIfExistsSync(opinionPath)).toBe(opinionBefore);
    const resumedBrief = readUtf8FileIfExistsSync(briefPath);
    expect(resumedBrief).toContain('rounds: 2');
    expect(resumedBrief).toContain(
      `output: ${roundReviewOpinionPath(resumedGroup.id, 1)}`,
    );
  });

  it('rejects lower effort without changing the completed review skeleton', async () => {
    const prepared = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot: fixture.projectRoot,
      branchName: fixture.branchName,
      baseRef: 'main',
      effort: 'high',
    });
    const highState = readPreparedReviewState(prepared);
    const highGroup = highState.groups[0];
    if (!highGroup) throw new Error('Expected one prepared review group');
    writeReviewStateFixtureJson(
      fixture.projectRoot,
      highState,
      roundReviewOpinionPath(highGroup.id, 1),
      buildReviewOpinion(highState, highGroup),
    );
    const validated = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.VALIDATE,
      projectRoot: fixture.projectRoot,
      branchName: fixture.branchName,
      kind: 'review',
      group: highGroup.id,
      round: 1,
    });
    expect(validated.summary).toMatchObject({ nextRound: null });
    const roundTwoPath = resolveReviewStateFixtureArtifact(
      fixture.projectRoot,
      highState.normalizedBranch,
      roundReviewOpinionPath(highGroup.id, 2),
    );
    const briefPath = resolveReviewStateFixtureArtifact(
      fixture.projectRoot,
      highState.normalizedBranch,
      highGroup.briefPath,
    );
    const highBrief = readUtf8FileIfExistsSync(briefPath);
    expect(highBrief).toContain(
      `output: ${roundReviewOpinionPath(highGroup.id, 1)}`,
    );

    await expect(
      handleReviewState({
        action: REVIEW_STATE_ACTIONS.PREPARE,
        projectRoot: fixture.projectRoot,
        branchName: fixture.branchName,
        baseRef: 'main',
        effort: 'low',
      }),
    ).rejects.toMatchObject({ code: 'review-effort-locked' });
    const resumed = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot: fixture.projectRoot,
      effort: 'high',
    });

    const resumedState = readPreparedReviewState(resumed);
    const resumedGroup = resumedState.groups[0];
    if (!resumedGroup) throw new Error('Expected one resumed review group');
    const resumedBrief = readUtf8FileIfExistsSync(briefPath);
    expect(readUtf8FileIfExistsSync(roundTwoPath)).toBeNull();
    expect(resumedGroup.validated.review?.complete).toBe(true);
    expect(resumedBrief).toContain('rounds: 3');
    expect(resumedBrief).toContain(
      `output: ${roundReviewOpinionPath(resumedGroup.id, 1)}`,
    );
  });
});
