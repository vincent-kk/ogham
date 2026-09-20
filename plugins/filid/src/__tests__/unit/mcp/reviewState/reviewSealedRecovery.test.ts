import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleReviewState } from '../../../../mcp/tools/reviewState/index.js';

import { completeIncrementalReview } from './helpers/completeIncrementalReview.js';
import { configureReviewGroups } from './helpers/configureReviewGroups.js';
import { createReviewStateSealFixture } from './helpers/createReviewStateSealFixture.js';

/** Sealed review whose published artifacts each case damages. */
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

/** Seal one review whose dirty worktree makes it INCONCLUSIVE with a blockers sidecar. */
async function sealWithBlockers() {
  await handleReviewState({
    action: 'prepare',
    projectRoot: fixture.projectRoot,
    effort: 'low',
  });
  await completeIncrementalReview(fixture.projectRoot);
  writeFileSync(
    join(fixture.projectRoot, 'src/value.ts'),
    'export const value = 7;\n',
  );
  return handleReviewState({
    action: 'seal',
    projectRoot: fixture.projectRoot,
  });
}

describe('a sealed review whose blockers are gone is re-sealed, not handed over', () => {
  it('marks a missing report stale with its own code, which revalidate must follow', async () => {
    const sealed = await sealWithBlockers();
    rmSync(sealed.data.reportPath!);
    const checkpoint = await handleReviewState({
      action: 'checkpoint',
      projectRoot: fixture.projectRoot,
    });
    expect(checkpoint.summary.disposition).toBe('stale');
    expect(checkpoint.diagnostics.map(({ code }) => code)).toEqual([
      'review-report-missing',
    ]);
    expect(checkpoint.diagnostics[0]!.nextAction).not.toContain('expected');
  });

  it('prepares a new generation from the same opinions and seals it again', async () => {
    const sealed = await sealWithBlockers();
    const earlierReport = readFileSync(sealed.data.reportPath!, 'utf8');
    if (!('blockersPath' in sealed.data) || !sealed.data.blockersPath)
      throw new Error('the sealed review has no blockers sidecar');
    rmSync(sealed.data.blockersPath);
    const prepared = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      effort: 'low',
    });
    expect(prepared.status).toBe('ok');
    expect(prepared.summary).toMatchObject({ reviewFiles: 0, reusedGroups: 1 });
    const resealed = await handleReviewState({
      action: 'seal',
      projectRoot: fixture.projectRoot,
    });
    expect(resealed.summary.disposition).toBe('sealed');
    expect(
      'blockersPath' in resealed.data &&
        existsSync(resealed.data.blockersPath!),
    ).toBe(true);
    expect(resealed.data.reportPath).not.toBe(sealed.data.reportPath);
    expect(readFileSync(sealed.data.reportPath!, 'utf8')).toBe(earlierReport);
  });
});
