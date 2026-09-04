import { rmSync } from 'node:fs';

import { writeFileAtomicallySync } from '@ogham/cross-platform';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { REVIEW_STATE_ACTIONS } from '../../../constants/reviewState.js';
import { handleReviewState } from '../../../mcp/tools/reviewState/index.js';

import {
  createReviewStateSealFixture,
  type ReviewStateSealFixture,
} from './reviewState/helpers/createReviewStateSealFixture.js';

/** Temporary Git repository and plugin root used by state-recovery cases. */
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

describe('review_state prepare state recovery', () => {
  it('rebuilds fresh from a truncated state file', async () => {
    const prepared = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot: fixture.projectRoot,
      branchName: fixture.branchName,
      baseRef: 'main',
    });
    writeFileAtomicallySync(prepared.data.statePath, '{"schemaVersion":');

    const recovered = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot: fixture.projectRoot,
      branchName: fixture.branchName,
      baseRef: 'main',
    });

    expect(recovered.status).toBe('ok');
    expect(recovered.summary.disposition).toBe('fresh');
  });
});
