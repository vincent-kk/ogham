import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleReviewState } from '../../../../mcp/tools/reviewState/index.js';

import { completeIncrementalReview } from './helpers/completeIncrementalReview.js';
import { configureReviewGroups } from './helpers/configureReviewGroups.js';
import {
  type ReviewStateSealFixture,
  createReviewStateSealFixture,
} from './helpers/createReviewStateSealFixture.js';
import { runReviewStateFixtureGit } from './helpers/runReviewStateFixtureGit.js';

/** Real lifecycle fixture used to prove all rendered cost surfaces agree. */
let fixture: ReviewStateSealFixture;
beforeEach(() => {
  fixture = createReviewStateSealFixture();
  configureReviewGroups(fixture.projectRoot, 2);
});
afterEach(() => {
  rmSync(fixture.projectRoot, { recursive: true, force: true });
  rmSync(fixture.pluginRoot, { recursive: true, force: true });
  if (fixture.originalPluginRoot === undefined)
    delete process.env.CLAUDE_PLUGIN_ROOT;
  else process.env.CLAUDE_PLUGIN_ROOT = fixture.originalPluginRoot;
});

/** Prepare the stable isolated host snapshot used by both generations. */
function prepare() {
  return handleReviewState({
    action: 'prepare',
    projectRoot: fixture.projectRoot,
    changeContext: 'Review assigned changes.',
    effort: 'low',
    actorContext: { mode: 'isolated', userInstructions: '' },
  });
}

describe('incremental verdict accounting', () => {
  it('keeps one reuse summary in prepare, checkpoint, seal, report and session', async () => {
    await prepare();
    const origin = (await completeIncrementalReview(fixture.projectRoot)).data
      .state!;
    await handleReviewState({
      action: 'seal',
      projectRoot: fixture.projectRoot,
    });
    const target = origin.groups[0].units[0].path;
    writeFileSync(
      join(fixture.projectRoot, target),
      'export const changed = 5;\n',
    );
    runReviewStateFixtureGit(fixture.projectRoot, ['add', target]);
    runReviewStateFixtureGit(fixture.projectRoot, [
      'commit',
      '-qm',
      'change one verdict input',
    ]);
    const prepared = await prepare();
    const expected = {
      reusedGroups: 1,
      rerunGroups: 1,
      newGroups: 0,
      removedGroups: 0,
      bookkeepingGroups: 0,
      remainingMaxReviewerHandoffs: 1,
    };
    expect(prepared.summary).toMatchObject(expected);
    const checkpoint = await completeIncrementalReview(fixture.projectRoot);
    expect(checkpoint.summary).toMatchObject(expected);
    const sealed = await handleReviewState({
      action: 'seal',
      projectRoot: fixture.projectRoot,
    });
    expect(sealed.summary).toMatchObject(expected);
    for (const path of [sealed.data.reportPath!, sealed.data.sessionPath!]) {
      const body = readFileSync(path, 'utf8');
      for (const [key, value] of Object.entries(expected))
        expect(body).toContain(`| ${key} | ${value} |`);
    }
    expect(
      (
        await handleReviewState({
          action: 'seal',
          projectRoot: fixture.projectRoot,
        })
      ).summary,
    ).toMatchObject(expected);
  });
});
