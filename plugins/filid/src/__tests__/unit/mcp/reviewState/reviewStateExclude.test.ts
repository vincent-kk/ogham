import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleReviewState } from '../../../../mcp/tools/reviewState/index.js';
import { readReviewWorktree } from '../../../../mcp/tools/reviewState/scope/readReviewWorktree.js';
import { seedFacts } from '../../../integration/helpers/seedFacts.js';

import { configureReviewGroups } from './helpers/configureReviewGroups.js';
import { createReviewStateSealFixture } from './helpers/createReviewStateSealFixture.js';
import { readPreparedReviewState } from './helpers/readPreparedReviewState.js';

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
});
