import { readFileSync, rmSync, writeFileSync } from 'node:fs';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleReviewState } from '../../../../mcp/tools/reviewState/index.js';
import { resolveReviewArtifactPath } from '../../../../mcp/tools/reviewState/state/resolveReviewArtifactPath.js';
import { resolveReviewStatePaths } from '../../../../mcp/tools/reviewState/state/resolveReviewStatePaths.js';

import { completeIncrementalReview } from './helpers/completeIncrementalReview.js';
import { configureReviewGroups } from './helpers/configureReviewGroups.js';
import { createReviewStateSealFixture } from './helpers/createReviewStateSealFixture.js';

/** Reviewed group whose stored rounds each case damages. */
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

describe('a group whose stored rounds no longer rebuild is reviewed again', () => {
  it('discards that group rounds and returns it as a handoff', async () => {
    await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      effort: 'low',
    });
    await completeIncrementalReview(fixture.projectRoot);
    const checkpoint = await handleReviewState({
      action: 'checkpoint',
      projectRoot: fixture.projectRoot,
    });
    const group = checkpoint.data.state!.groups[0]!;
    const paths = resolveReviewStatePaths(
      fixture.projectRoot,
      fixture.branchName,
    );
    const roundPath = resolveReviewArtifactPath(
      paths,
      `opinions/review-${group.id}.r1.json`,
    );
    const round = JSON.parse(readFileSync(roundPath, 'utf8'));
    writeFileSync(
      resolveReviewArtifactPath(paths, group.opinionPath),
      JSON.stringify({ ...round, findings: 'not-a-list' }),
    );
    writeFileSync(roundPath, JSON.stringify({ ...round, units: [] }));
    const prepared = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      effort: 'low',
    });
    expect(prepared.status).toBe('ok');
    expect(
      prepared.data.next.map(({ kind, group: id, round: number }) => [
        kind,
        id,
        number,
      ]),
    ).toContainEqual(['review', group.id, 1]);
  });
});
