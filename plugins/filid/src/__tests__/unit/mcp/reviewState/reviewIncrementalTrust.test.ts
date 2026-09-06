import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readReviewGroupArtifactStatus } from '../../../../mcp/tools/reviewState/handoff/readReviewGroupArtifactStatus.js';
import { handleReviewState } from '../../../../mcp/tools/reviewState/index.js';
import { resolveReviewStatePaths } from '../../../../mcp/tools/reviewState/state/resolveReviewStatePaths.js';
import type { ReviewStateRecord } from '../../../../mcp/tools/reviewState/state/reviewStateTypes.js';

import { completeIncrementalReview } from './helpers/completeIncrementalReview.js';
import { configureReviewGroups } from './helpers/configureReviewGroups.js';
import {
  type ReviewStateSealFixture,
  createReviewStateSealFixture,
} from './helpers/createReviewStateSealFixture.js';
import { runReviewStateFixtureGit } from './helpers/runReviewStateFixtureGit.js';

/** Each test owns committed inputs and complete origin artifacts. */
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

/**
 * Prepare the same host/PR snapshot for an isolated or fallback host.
 * @param force Explicit full rerun, preserving old generations.
 * @param mode Enforced actor boundary or conservative fallback.
 * @returns The real prepare response.
 */
function prepare(force = false) {
  return handleReviewState({
    action: 'prepare',
    projectRoot: fixture.projectRoot,
    changeContext: 'Review assigned changes.',
    effort: 'low',
    userInstructions: '',
    force,
  });
}

describe('incremental opinion provenance', () => {
  it('carries unchanged bytes, reviews only the edited group and matches a full rerun verdict', async () => {
    const first = await prepare();
    const finished = await completeIncrementalReview(fixture.projectRoot);
    const origin = finished.data.state!;
    const oldBytes = readFileSync(
      join(first.data.reviewDirectory, origin.groups[1].opinionPath),
      'utf8',
    );
    await handleReviewState({
      action: 'seal',
      projectRoot: fixture.projectRoot,
    });
    const target = origin.groups[0].units[0].path;
    writeFileSync(
      join(fixture.projectRoot, target),
      'export const changed = 3;\n',
    );
    runReviewStateFixtureGit(fixture.projectRoot, ['add', target]);
    runReviewStateFixtureGit(fixture.projectRoot, [
      'commit',
      '-qm',
      'change assigned input',
    ]);
    const next = await prepare();
    expect(next.summary).toMatchObject({
      reusedGroups: 1,
      rerunGroups: 1,
      remainingMaxReviewerHandoffs: 1,
    });
    expect(
      next.data.groups
        .filter((group) => !group.reusedFrom)
        .flatMap((group) => group.units.map((unit) => unit.path)),
    ).toEqual([target]);
    expect(
      readFileSync(
        join(next.data.reviewDirectory, origin.groups[1].opinionPath),
        'utf8',
      ),
    ).toBe(oldBytes);
    expect(JSON.parse(oldBytes).sourceHash).toBe(origin.sourceHash);
    expect(next.summary.sourceHash).not.toBe(origin.sourceHash);
    await completeIncrementalReview(fixture.projectRoot);
    const mixed = await handleReviewState({
      action: 'seal',
      projectRoot: fixture.projectRoot,
    });
    await prepare(true);
    await completeIncrementalReview(fixture.projectRoot);
    const full = await handleReviewState({
      action: 'seal',
      projectRoot: fixture.projectRoot,
    });
    expect(mixed.summary.verdict).toBe(full.summary.verdict);
    expect(mixed.summary.indeterminate).toBe(full.summary.indeterminate);
    expect(
      readFileSync(
        join(first.data.reviewDirectory, origin.groups[1].opinionPath),
        'utf8',
      ),
    ).toBe(oldBytes);
  });

  it('rejects a forged origin snapshot even when copied opinion bytes remain unchanged', async () => {
    await prepare();
    await completeIncrementalReview(fixture.projectRoot);
    runReviewStateFixtureGit(fixture.projectRoot, [
      'commit',
      '--allow-empty',
      '-qm',
      'same content',
    ]);
    const branch = runReviewStateFixtureGit(fixture.projectRoot, [
      'branch',
      '--show-current',
    ]);
    const prior = resolveReviewStatePaths(fixture.projectRoot, branch);
    const state = JSON.parse(
      readFileSync(prior.statePath, 'utf8'),
    ) as ReviewStateRecord;
    writeFileSync(
      join(fixture.projectRoot, state.groups[0].units[0].path),
      'export const changed = 4;\n',
    );
    runReviewStateFixtureGit(fixture.projectRoot, ['add', '.']);
    runReviewStateFixtureGit(fixture.projectRoot, [
      'commit',
      '-qm',
      'change one group',
    ]);
    const next = await prepare();
    expect(next.summary.reusedGroups).toBe(1);
    writeFileSync(join(next.data.reviewDirectory, 'origin-state.json'), '{}');
    const current = JSON.parse(
      readFileSync(next.data.statePath, 'utf8'),
    ) as ReviewStateRecord;
    const statuses = readReviewGroupArtifactStatus(
      current,
      resolveReviewStatePaths(fixture.projectRoot, branch),
    );
    expect(
      statuses.find((entry) => entry.group === state.groups[1].id)?.review,
    ).toBe('invalid');
  });

  it('reuses a sealed ordinary run without a host execution-mode declaration', async () => {
    const first = await prepare(false);
    await completeIncrementalReview(fixture.projectRoot);
    await handleReviewState({
      action: 'seal',
      projectRoot: fixture.projectRoot,
    });
    const next = await prepare(false);
    expect(next.summary.reusedGroups).toBe(0);
    expect(next.summary.disposition).toBe('cached');
    expect(next.data.next).toEqual([]);
    expect(next.data.reviewDirectory).toBe(first.data.reviewDirectory);
  });
});
