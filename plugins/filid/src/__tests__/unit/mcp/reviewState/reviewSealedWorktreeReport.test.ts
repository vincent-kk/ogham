import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleReviewState } from '../../../../mcp/tools/reviewState/index.js';

import { completeIncrementalReview } from './helpers/completeIncrementalReview.js';
import { configureReviewGroups } from './helpers/configureReviewGroups.js';
import { createReviewStateSealFixture } from './helpers/createReviewStateSealFixture.js';

/** Sealed review whose worktree changes after the verdict. */
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

describe('uncommitted work after a seal is reported, not turned into a question', () => {
  it('reviews again once the dirty work that forced INCONCLUSIVE is gone', async () => {
    const committed = readFileSync(
      join(fixture.projectRoot, 'src/value.ts'),
      'utf8',
    );
    await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      effort: 'low',
    });
    await completeIncrementalReview(fixture.projectRoot);
    writeFileSync(
      join(fixture.projectRoot, 'src/value.ts'),
      'export const value = 99;\n',
    );
    const inconclusive = await handleReviewState({
      action: 'seal',
      projectRoot: fixture.projectRoot,
    });
    expect(inconclusive.summary.verdict).toBe('INCONCLUSIVE');
    writeFileSync(join(fixture.projectRoot, 'src/value.ts'), committed);
    const prepared = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      effort: 'low',
    });
    expect(prepared.summary).toMatchObject({ reviewFiles: 0, reusedGroups: 1 });
    const resealed = await handleReviewState({
      action: 'seal',
      projectRoot: fixture.projectRoot,
    });
    expect(resealed.summary.verdict).toBe('APPROVED');
    expect(readFileSync(resealed.data.reportPath!, 'utf8')).not.toContain(
      'source-dirty',
    );
  });

  it('returns the sealed verdict again and names the changes it does not cover', async () => {
    await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      effort: 'low',
    });
    await completeIncrementalReview(fixture.projectRoot);
    const sealed = await handleReviewState({
      action: 'seal',
      projectRoot: fixture.projectRoot,
    });
    const report = readFileSync(sealed.data.reportPath!, 'utf8');
    writeFileSync(
      join(fixture.projectRoot, 'src/value.ts'),
      'export const value = 99;\n',
    );
    const repeated = await handleReviewState({
      action: 'seal',
      projectRoot: fixture.projectRoot,
    });
    expect(repeated.summary).toMatchObject({
      disposition: 'sealed',
      verdict: sealed.summary.verdict,
    });
    const diagnostic = repeated.diagnostics.find(
      ({ code }) => code === 'review-worktree-stale',
    );
    expect(diagnostic?.affects).toEqual([]);
    expect(diagnostic?.nextAction).toMatch(/^Report that/);
    expect(diagnostic?.nextAction).not.toMatch(/\buser\b/);
    expect(readFileSync(sealed.data.reportPath!, 'utf8')).toBe(report);
  });
});
