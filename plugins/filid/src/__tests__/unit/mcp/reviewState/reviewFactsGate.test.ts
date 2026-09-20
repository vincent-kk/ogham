import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleFacts } from '../../../../mcp/tools/facts/index.js';
import type { FactsStatusSummary } from '../../../../mcp/tools/facts/index.js';
import { handleReviewState } from '../../../../mcp/tools/reviewState/index.js';
import { seedFacts } from '../../../integration/helpers/seedFacts.js';

import { completeIncrementalReview } from './helpers/completeIncrementalReview.js';
import { configureReviewGroups } from './helpers/configureReviewGroups.js';
import {
  type ReviewStateSealFixture,
  createReviewStateSealFixture,
} from './helpers/createReviewStateSealFixture.js';
import { readPreparedReviewState } from './helpers/readPreparedReviewState.js';
import { runReviewStateFixtureGit } from './helpers/runReviewStateFixtureGit.js';
import { writeReviewStateFixtureFile } from './helpers/writeReviewStateFixtureFile.js';

let fixture: ReviewStateSealFixture;

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

/**
 * Commit one file's contents on the fixture branch.
 * @param path Project-relative POSIX path.
 * @param contents File body.
 */
function commit(path: string, contents: string): void {
  writeReviewStateFixtureFile(fixture.projectRoot, path, contents);
  runReviewStateFixtureGit(fixture.projectRoot, ['add', '--all']);
  runReviewStateFixtureGit(fixture.projectRoot, ['commit', '-m', `add ${path}`]);
}

/**
 * Drop `src/value.ts`'s one edge from its record, which opens an item.
 *
 * The file is then `uncertain` for a reason re-extraction reproduces, which is
 * the state the extraction list cannot carry.
 * @returns Nothing; the side table holds one unadjudicated item.
 */
async function openOneItem(): Promise<void> {
  const status = await handleFacts({
    action: 'status',
    path: fixture.projectRoot,
  });
  const bytes = readFileSync(join(fixture.projectRoot, 'src/value.ts'));
  const file = join(fixture.pluginRoot, 'shrink.json');
  writeFileSync(
    file,
    JSON.stringify([
      {
        schemaVersion: 1,
        path: 'src/value.ts',
        contentHash: `sha256:${createHash('sha256').update(bytes).digest('hex')}`,
        references: [],
        provenance: {
          tool: 'other-tool',
          version: '1.0.0',
          command: 'test',
          tier: 'tool',
          resolutionInputs: [],
        },
      },
    ]),
  );
  await handleFacts({
    action: 'submit',
    path: fixture.projectRoot,
    file,
    resolutionEpoch: (status.summary as FactsStatusSummary).resolutionEpoch,
  });
}

/**
 * Prepare the fixture branch.
 * @returns The prepare result.
 */
function prepare() {
  return handleReviewState({
    action: 'prepare',
    projectRoot: fixture.projectRoot,
    branchName: fixture.branchName,
    baseRef: 'main',
    effort: 'low',
  });
}

describe('prepare refuses a review scope whose facts are not settled', () => {
  it('names the unsettled files and the bootstrap when a changed file has no record', async () => {
    commit('src/value.ts', "export const value = 'changed';\n");

    // Grouped by cause, because the causes take different actions: a caller
    // told only the paths re-extracts the ones re-extraction cannot change.
    await expect(prepare()).rejects.toMatchObject({
      code: 'facts-incomplete',
      message: expect.stringContaining('facts-missing (1): src/value.ts'),
      nextAction: expect.stringContaining('facts status'),
    });
  });

  it('routes an uncertain file by the status list that holds it, not by re-extraction', async () => {
    commit('src/helper.ts', 'export const helper = 1;\n');
    commit(
      'src/value.ts',
      "import { helper } from './helper.js';\n\nexport const value = helper;\n",
    );
    await seedFacts(fixture.projectRoot);
    await openOneItem();

    await expect(prepare()).rejects.toMatchObject({
      code: 'facts-incomplete',
      message: expect.stringContaining('facts-uncertain (1): src/value.ts'),
      nextAction: expect.stringContaining('unadjudicated'),
    });
  });

  it('carries the refusal into a handoff response instead of swallowing it', async () => {
    commit('src/value.ts', "export const value = 'changed';\n");

    const result = await handleReviewState({
      action: 'handoff',
      projectRoot: fixture.projectRoot,
      branchName: fixture.branchName,
      baseRef: 'main',
      documentSync: 'ok',
      repaired: 0,
    });

    // The document still records that sync failed — that is not a blocker —
    // but the reason is identifiable by code and carries its own next action.
    expect(result.summary).toMatchObject({ documentSync: 'failed' });
    expect(result.diagnostics?.map(({ code }) => code)).toContain(
      'facts-incomplete',
    );
    expect(result.diagnostics?.[0]?.nextAction).toContain('facts status');
  });

  it('proceeds once every file in the review scope is exact', async () => {
    commit('src/value.ts', "export const value = 'changed';\n");
    await seedFacts(fixture.projectRoot);

    const state = readPreparedReviewState(await prepare());

    expect(state.scope.statuses.analysisAxes?.dependencies).toBe('exact');
  });

  it('keeps a changed file the extractor could not read as a finding, not a refusal', async () => {
    writeFileSync(
      join(fixture.projectRoot, 'src/value.ts'),
      Buffer.from([0x65, 0x00, 0x0a]),
    );
    execFileSync('git', ['commit', '-am', 'unreadable bytes', '-q'], {
      cwd: fixture.projectRoot,
    });
    await seedFacts(fixture.projectRoot);

    const state = readPreparedReviewState(await prepare());

    expect(
      state.scope.candidates.map(({ rule, path }) => [rule, path]),
    ).toContainEqual(['facts-tool-error', 'src/value.ts']);
  });
});

describe('a fix commit during a review cannot reach a verdict without its facts', () => {
  it('stops at the stale source and is unblocked only by the facts gate', async () => {
    commit('src/value.ts', "export const value = 'reviewed';\n");
    await seedFacts(fixture.projectRoot);
    await prepare();
    await completeIncrementalReview(fixture.projectRoot);

    // The fix commit: new bytes, and no record describes them.
    commit('src/value.ts', "export const value = 'fixed';\n");

    const checkpoint = await handleReviewState({
      action: 'checkpoint',
      projectRoot: fixture.projectRoot,
      branchName: fixture.branchName,
    });
    expect(checkpoint.status).toBe('indeterminate');
    expect(checkpoint.diagnostics?.map(({ code }) => code)).toContain(
      'review-source-hash-stale',
    );

    // Seal refuses on the same evidence, so no verdict is published from the
    // old generation. Checkpoint itself reads no reference-based evidence —
    // the committed source identity is what it compares — so the facts gate
    // is not repeated here; it is repeated where facts are read, in prepare.
    const sealed = await handleReviewState({
      action: 'seal',
      projectRoot: fixture.projectRoot,
      branchName: fixture.branchName,
    });
    expect(sealed.status).toBe('indeterminate');
    expect(sealed.summary).not.toMatchObject({ disposition: 'sealed' });

    await expect(prepare()).rejects.toMatchObject({
      code: 'facts-incomplete',
      message: expect.stringContaining('src/value.ts'),
    });

    await seedFacts(fixture.projectRoot);
    await prepare();
    await completeIncrementalReview(fixture.projectRoot);

    expect(
      (
        await handleReviewState({
          action: 'seal',
          projectRoot: fixture.projectRoot,
          branchName: fixture.branchName,
        })
      ).status,
    ).toBe('ok');
  });
});
