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

/** Temporary Git repository and plugin root used by effort-resume cases. */
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

describe('review_state prepare effort resume', () => {
  it('preserves opinions and retunes rounds for the same source', async () => {
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
    expect(validated.status).toBe('ok');
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
    expect(resumed.summary.disposition).toBe('resumable');
    expect(highState.effort).toBe('high');
    expect(highState.groups[0]?.rounds).toBe(3);
    expect(readUtf8FileIfExistsSync(opinionPath)).toBe(opinionBefore);
    expect(highState.groups[0]?.validated.review).toMatchObject({
      round: 1,
      complete: false,
    });
    expect(
      readUtf8FileIfExistsSync(
        resolveReviewStateFixtureArtifact(
          fixture.projectRoot,
          highState.normalizedBranch,
          highState.groups[0]?.briefPath ?? '',
        ),
      ),
    ).toContain('rounds: 3');
  });
});
