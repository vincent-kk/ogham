import { readFileSync, rmSync } from 'node:fs';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleReviewState } from '../../../../mcp/tools/reviewState/index.js';

import { configureReviewGroups } from './helpers/configureReviewGroups.js';
import {
  type ReviewStateSealFixture,
  createReviewStateSealFixture,
} from './helpers/createReviewStateSealFixture.js';
import { readPreparedReviewState } from './helpers/readPreparedReviewState.js';

/** Disposable repository for real prepare boundary checks. */
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

describe('prepare automatic review cost', () => {
  it.each([15, 16, 46, 64])(
    'selects effort after grouping %s reviewable files',
    async (count) => {
      configureReviewGroups(fixture.projectRoot, count);
      const prepared = await handleReviewState({
        action: 'prepare',
        projectRoot: fixture.projectRoot,
        baseRef: 'main',
      });
      const effort = count < 16 ? 'medium' : 'low';
      const reason = count < 16 ? 'auto-standard' : 'auto-large';
      expect(prepared.summary).toMatchObject({
        effortMode: 'auto',
        effort,
        effortReason: reason,
        autoLowEffortGroupThreshold: 16,
        concurrency: 8,
        reviewableGroups: count,
        maxReviewerHandoffs: count * (effort === 'medium' ? 2 : 1),
      });
      expect(prepared.data.groups).toHaveLength(count);
      expect(prepared.data.next).toHaveLength(count);
      expect(
        prepared.data.files.filter((file) => file.skipReason === null),
      ).toHaveLength(count);
      expect(readPreparedReviewState(prepared)).toMatchObject({
        effortMode: 'auto',
        effort,
        effortReason: reason,
      });
      const session = readFileSync(prepared.data.sessionPath, 'utf8');
      expect(session).toContain(`effort_reason: ${reason}`);
      expect(session).toContain(`reviewable_groups: ${count}`);
    },
  );

  it('rejects 65 groups at the default budget before dispatch', async () => {
    configureReviewGroups(fixture.projectRoot, 65);
    await expect(
      handleReviewState({
        action: 'prepare',
        projectRoot: fixture.projectRoot,
        baseRef: 'main',
      }),
    ).rejects.toThrow('review.maxGroups=64');
  });

  it('allows an explicit larger budget and fixed effort override', async () => {
    configureReviewGroups(fixture.projectRoot, 65, {
      maxGroups: 65,
      effort: 'low',
    });
    const result = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      baseRef: 'main',
      effort: 'high',
    });
    expect(result.summary).toMatchObject({
      effortMode: 'high',
      effort: 'high',
      effortReason: 'fixed',
      reviewableGroups: 65,
      maxReviewerHandoffs: 195,
      concurrency: 8,
    });
  });

  it('takes configured effort before the default and accepts explicit auto on a fresh run', async () => {
    configureReviewGroups(fixture.projectRoot, 1, {
      effort: 'high',
      autoLowEffortGroupThreshold: 1,
    });
    const fixed = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
    });
    expect(fixed.summary).toMatchObject({
      effort: 'high',
      effortReason: 'fixed',
    });
    const auto = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      effort: 'auto',
      force: true,
    });
    expect(auto.summary).toMatchObject({
      effort: 'low',
      effortMode: 'auto',
      effortReason: 'auto-large',
    });
  });
});
