import { rmSync } from 'node:fs';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { REVIEW_STATE_ACTIONS } from '../../../constants/reviewState.js';
import { handleReviewState } from '../../../mcp/tools/reviewState/index.js';

import {
  type ReviewStateSealFixture,
  createReviewStateSealFixture,
} from './reviewState/helpers/createReviewStateSealFixture.js';
import { writeReviewStateFixtureFile } from './reviewState/helpers/writeReviewStateFixtureFile.js';

/** Temporary Git repository and plugin root used by config-warning cases. */
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

describe('review_state prepare config warning scope', () => {
  it('ignores invalid structure warnings and uses review defaults', async () => {
    writeReviewStateFixtureFile(
      fixture.projectRoot,
      '.filid/config.json',
      `${JSON.stringify({
        version: '2.0',
        adapters: { mode: 'auto', enabled: [] },
        rules: {},
        structure: { maxDepth: -1 },
      })}\n`,
    );

    const result = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot: fixture.projectRoot,
      branchName: fixture.branchName,
      baseRef: 'main',
    });

    expect(result.status).toBe('ok');
    expect(result.summary).toMatchObject({
      effort: 'medium',
      concurrency: 8,
    });
  });

  it('rejects invalid review warnings after sanitization', async () => {
    writeReviewStateFixtureFile(
      fixture.projectRoot,
      '.filid/config.json',
      `${JSON.stringify({
        version: '2.0',
        adapters: { mode: 'auto', enabled: [] },
        rules: {},
        review: { concurrency: -1 },
      })}\n`,
    );

    await expect(
      handleReviewState({
        action: REVIEW_STATE_ACTIONS.PREPARE,
        projectRoot: fixture.projectRoot,
        branchName: fixture.branchName,
        baseRef: 'main',
      }),
    ).rejects.toThrow('config validation failed');
  });
});
