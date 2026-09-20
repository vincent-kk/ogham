import { rmSync } from 'node:fs';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleReviewState } from '../../../../mcp/tools/reviewState/index.js';

import { completeIncrementalReview } from './helpers/completeIncrementalReview.js';
import { configureReviewGroups } from './helpers/configureReviewGroups.js';
import { createReviewStateSealFixture } from './helpers/createReviewStateSealFixture.js';
import { readPreparedReviewState } from './helpers/readPreparedReviewState.js';

/** Review prepared at one effort, re-prepared at another. */
let fixture: Awaited<ReturnType<typeof createReviewStateSealFixture>>;

beforeEach(async () => {
  fixture = await createReviewStateSealFixture();
  await configureReviewGroups(fixture.projectRoot, 1);
});
afterEach(() => {
  rmSync(fixture.projectRoot, { recursive: true, force: true });
  rmSync(fixture.pluginRoot, { recursive: true, force: true });
  if (fixture.originalPluginRoot === undefined)
    delete process.env.CLAUDE_PLUGIN_ROOT;
  else process.env.CLAUDE_PLUGIN_ROOT = fixture.originalPluginRoot;
});

describe('a prepared effort changes only when the caller names one', () => {
  it('reports an effort argument a sealed review cannot apply', async () => {
    await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      effort: 'low',
    });
    await completeIncrementalReview(fixture.projectRoot);
    await handleReviewState({
      action: 'seal',
      projectRoot: fixture.projectRoot,
    });
    const cached = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      effort: 'high',
    });
    expect(cached.summary.disposition).toBe('cached');
    const diagnostic = cached.diagnostics.find(
      ({ code }) => code === 'review-effort-locked',
    );
    expect(diagnostic?.message).toContain('was not applied');
    expect(diagnostic?.nextAction).toMatch(/^Report that/);
  });

  it('opens a new generation at the effort the argument names', async () => {
    await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      effort: 'low',
    });
    const reprepared = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      effort: 'high',
    });
    expect(reprepared.status).toBe('ok');
    expect(readPreparedReviewState(reprepared).effort).toBe('high');
  });

  it('keeps the prepared effort when only the config names another, and reports it', async () => {
    await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      effort: 'low',
    });
    await configureReviewGroups(fixture.projectRoot, 1, { effort: 'high' });
    const resumed = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
    });
    expect(resumed.status).toBe('ok');
    expect(readPreparedReviewState(resumed).effort).toBe('low');
    const diagnostic = resumed.diagnostics.find(
      ({ code }) => code === 'review-effort-locked',
    );
    expect(diagnostic?.affects).toEqual([]);
    expect(diagnostic?.nextAction).toMatch(/^Report that/);
  });
});
