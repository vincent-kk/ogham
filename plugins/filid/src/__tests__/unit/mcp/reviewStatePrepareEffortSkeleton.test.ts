import { rmSync } from 'node:fs';

import { readUtf8FileIfExistsSync } from '@ogham/cross-platform';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { REVIEW_STATE_ACTIONS } from '../../../constants/reviewState.js';
import { renderOpinionSkeleton } from '../../../mcp/tools/reviewState/brief/renderOpinionSkeleton.js';
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
  it('creates the next skeleton when raised effort reopens a complete review', async () => {
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

    const resumed = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot: fixture.projectRoot,
      branchName: fixture.branchName,
      baseRef: 'main',
      effort: 'high',
    });

    const highState = readPreparedReviewState(resumed);
    const highGroup = highState.groups[0];
    if (!highGroup) throw new Error('Expected one resumed review group');
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

    expect(readUtf8FileIfExistsSync(roundTwoPath)).toBe(
      renderOpinionSkeleton(highGroup, highState.sourceHash, 2),
    );
    expect(readUtf8FileIfExistsSync(opinionPath)).toBe(opinionBefore);
    const highBrief = readUtf8FileIfExistsSync(briefPath);
    expect(highBrief).toContain('rounds: 3');
    expect(highBrief).toContain('"round": 2');
    expect(highBrief).toContain(
      `output: ${roundReviewOpinionPath(highGroup.id, 2)}`,
    );
  });

  it('does not create a skeleton when lower effort keeps a review complete', async () => {
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

    const resumed = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot: fixture.projectRoot,
      branchName: fixture.branchName,
      baseRef: 'main',
      effort: 'low',
    });

    const lowState = readPreparedReviewState(resumed);
    const lowGroup = lowState.groups[0];
    if (!lowGroup) throw new Error('Expected one resumed review group');
    const lowBrief = readUtf8FileIfExistsSync(briefPath);
    expect(readUtf8FileIfExistsSync(roundTwoPath)).toBeNull();
    expect(lowGroup.validated.review?.complete).toBe(true);
    expect(lowBrief).toContain('rounds: 1');
    expect(lowBrief).toContain(
      `output: ${roundReviewOpinionPath(lowGroup.id, 1)}`,
    );
  });
});
