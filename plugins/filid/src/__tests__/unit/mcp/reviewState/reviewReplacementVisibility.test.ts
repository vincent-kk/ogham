import { readFileSync, rmSync, writeFileSync } from 'node:fs';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleReviewState } from '../../../../mcp/tools/reviewState/index.js';

import { completeIncrementalReview } from './helpers/completeIncrementalReview.js';
import { configureReviewGroups } from './helpers/configureReviewGroups.js';
import { createReviewStateSealFixture } from './helpers/createReviewStateSealFixture.js';

/** Review sealed once, then re-run after its state is damaged. */
let fixture: ReturnType<typeof createReviewStateSealFixture>;

beforeEach(() => {
  fixture = createReviewStateSealFixture();
  configureReviewGroups(fixture.projectRoot, 1);
});
afterEach(() => {
  rmSync(fixture.projectRoot, { recursive: true, force: true });
  rmSync(fixture.pluginRoot, { recursive: true, force: true });
  if (fixture.originalPluginRoot === undefined)
    delete process.env.CLAUDE_PLUGIN_ROOT;
  else process.env.CLAUDE_PLUGIN_ROOT = fixture.originalPluginRoot;
});

/** Break the branch state so the next prepare must replace it. */
function damageState(statePath: string): void {
  writeFileSync(
    statePath,
    JSON.stringify({
      ...JSON.parse(readFileSync(statePath, 'utf8')),
      schemaVersion: 1,
    }),
  );
}

describe('a review that replaced an earlier one says so in what it publishes', () => {
  it('keeps the verdict of the oldest generation across two replacements', async () => {
    const prepared = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      effort: 'low',
    });
    await completeIncrementalReview(fixture.projectRoot);
    await handleReviewState({
      action: 'seal',
      projectRoot: fixture.projectRoot,
    });
    for (const _ of [1, 2]) {
      damageState(prepared.data.statePath);
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
    }
    const last = await handleReviewState({
      action: 'seal',
      projectRoot: fixture.projectRoot,
    });
    const report = readFileSync(last.data.reportPath!, 'utf8');
    expect(report).toContain('had APPROVED');
    expect(report).toContain('earlier replacement');
  });

  it('records a replacement when the state file is gone but its work is not', async () => {
    const prepared = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      effort: 'low',
    });
    await completeIncrementalReview(fixture.projectRoot);
    await handleReviewState({
      action: 'seal',
      projectRoot: fixture.projectRoot,
    });
    rmSync(prepared.data.statePath);
    await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      effort: 'low',
    });
    await completeIncrementalReview(fixture.projectRoot);
    const resealed = await handleReviewState({
      action: 'seal',
      projectRoot: fixture.projectRoot,
    });
    const report = readFileSync(resealed.data.reportPath!, 'utf8');
    expect(report).toContain('review-state-missing');
    expect(report).toContain('had APPROVED');
  });

  it('names the superseded generation and its verdict in the report, the PR comment and seal', async () => {
    const prepared = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      effort: 'low',
    });
    await completeIncrementalReview(fixture.projectRoot);
    const first = await handleReviewState({
      action: 'seal',
      projectRoot: fixture.projectRoot,
    });
    expect(first.summary.verdict).toBe('APPROVED');
    const priorGeneration = prepared.summary.generationId;
    writeFileSync(
      prepared.data.statePath,
      JSON.stringify({
        ...JSON.parse(readFileSync(prepared.data.statePath, 'utf8')),
        schemaVersion: 1,
      }),
    );
    await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      effort: 'low',
    });
    await completeIncrementalReview(fixture.projectRoot);
    const second = await handleReviewState({
      action: 'seal',
      projectRoot: fixture.projectRoot,
    });
    const replaced = second.diagnostics.find(
      ({ code }) => code === 'review-state-replaced',
    );
    expect(replaced?.affects).toEqual([]);
    const report = readFileSync(second.data.reportPath!, 'utf8');
    const comment = readFileSync(second.data.prCommentPath!, 'utf8');
    for (const text of [report, comment]) {
      expect(text).toContain('This review replaces');
      expect(text).toContain('review-state-schema-mismatch');
      expect(text).toContain('published a verdict');
      expect(text).toContain('had APPROVED');
      expect(text).toContain(priorGeneration!);
    }
  });
});
