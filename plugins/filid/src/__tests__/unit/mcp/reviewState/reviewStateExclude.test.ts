import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleReviewState } from '../../../../mcp/tools/reviewState/index.js';
import { prepareReviewArtifacts } from '../../../../mcp/tools/reviewState/handlers/prepareReviewArtifacts.js';
import { readReviewWorktree } from '../../../../mcp/tools/reviewState/scope/readReviewWorktree.js';
import { resolveReviewStatePaths } from '../../../../mcp/tools/reviewState/state/resolveReviewStatePaths.js';
import { seedFacts } from '../../../integration/helpers/seedFacts.js';

import { configureReviewGroups } from './helpers/configureReviewGroups.js';
import { createReviewStateSealFixture } from './helpers/createReviewStateSealFixture.js';
import { readPreparedReviewState } from './helpers/readPreparedReviewState.js';
import { runReviewStateFixtureGit } from './helpers/runReviewStateFixtureGit.js';

let fixture: Awaited<ReturnType<typeof createReviewStateSealFixture>>;

beforeEach(async () => {
  fixture = await createReviewStateSealFixture();
  await configureReviewGroups(fixture.projectRoot, 2);
});

afterEach(() => {
  rmSync(fixture.projectRoot, { recursive: true, force: true });
  rmSync(fixture.pluginRoot, { recursive: true, force: true });
  if (fixture.originalPluginRoot === undefined) delete process.env.CLAUDE_PLUGIN_ROOT;
  else process.env.CLAUDE_PLUGIN_ROOT = fixture.originalPluginRoot;
});

describe('review_state exclude', () => {
  it('does not clear an excluded skip reason in unresolved staging', async () => {
    const configPath = join(fixture.projectRoot, '.filid/config.json');
    const config = JSON.parse(readFileSync(configPath, 'utf8')) as Record<string, unknown>;
    config.exclude = ['src/value1.ts'];
    writeFileSync(configPath, JSON.stringify(config));
    await seedFacts(fixture.projectRoot);

    const prepared = await prepareReviewArtifacts(
      {
        action: 'prepare',
        projectRoot: fixture.projectRoot,
        branchName: fixture.branchName,
        force: true,
        effort: 'low',
      },
      {
        paths: resolveReviewStatePaths(fixture.projectRoot, fixture.branchName),
        previous: null,
        unresolvedPaths: ['src/value1.ts'],
      },
    );
    const state = readPreparedReviewState(prepared);
    expect(state.scope.files.find((file) => file.path === 'src/value1.ts'))
      .toMatchObject({ role: 'excluded', skipReason: 'excluded by config' });
  });

  it('assess treats an excluded dirty source file as a clean worktree', async () => {
    const configPath = join(fixture.projectRoot, '.filid/config.json');
    const config = JSON.parse(readFileSync(configPath, 'utf8')) as Record<string, unknown>;
    config.exclude = ['src/value1.ts'];
    writeFileSync(configPath, JSON.stringify(config));
    writeFileSync(join(fixture.projectRoot, 'src/value1.ts'), 'dirty mock\n');

    const assessed = await handleReviewState({
      action: 'assess',
      projectRoot: fixture.projectRoot,
    });
    expect(assessed.summary.worktreeDisposition).toBe('clean');
    expect(assessed.data.assessment?.worktree).toMatchObject({
      documents: [], generated: [], source: [],
    });
  });

  it('keeps excluded committed files visible without reviewing or freezing them', async () => {
    const configPath = join(fixture.projectRoot, '.filid/config.json');
    const config = JSON.parse(readFileSync(configPath, 'utf8')) as Record<string, unknown>;
    config.exclude = ['src/value1.ts'];
    writeFileSync(configPath, JSON.stringify(config));
    await seedFacts(fixture.projectRoot);

    const prepared = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      effort: 'low',
    });
    expect(prepared.summary.excludedFiles).toBe(1);
    const state = readPreparedReviewState(prepared);
    expect(state.scope.files.find((file) => file.path === 'src/value1.ts')).toMatchObject({
      role: 'excluded', owner: null, skipReason: 'excluded by config',
    });
    expect(state.groups.flatMap((group) => group.units.map((unit) => unit.path)))
      .not.toContain('src/value1.ts');
    expect(readFileSync(prepared.data.factsPath, 'utf8')).not.toContain('src/value1.ts');

    writeFileSync(join(fixture.projectRoot, 'src/value1.ts'), 'dirty mock\n');
    const worktree = await readReviewWorktree(fixture.projectRoot, [], ['src/value1.ts']);
    expect(worktree).toMatchObject({ worktree: 'clean', dirtyPaths: [] });
  });

  it('keeps an excluded roster entry through incremental preparation', async () => {
    const configPath = join(fixture.projectRoot, '.filid/config.json');
    const config = JSON.parse(readFileSync(configPath, 'utf8')) as Record<string, unknown>;
    config.exclude = ['src/value1.ts'];
    writeFileSync(configPath, JSON.stringify(config));
    await seedFacts(fixture.projectRoot);
    await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      effort: 'low',
    });

    writeFileSync(join(fixture.projectRoot, 'src/value.ts'), 'export const value = 3;\n');
    runReviewStateFixtureGit(fixture.projectRoot, ['commit', '-am', 'Change value']);
    await seedFacts(fixture.projectRoot);
    const next = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      effort: 'low',
    });
    const state = readPreparedReviewState(next);
    expect(state.scope.files.find((file) => file.path === 'src/value1.ts'))
      .toMatchObject({ role: 'excluded', skipReason: 'excluded by config' });
  });
});
