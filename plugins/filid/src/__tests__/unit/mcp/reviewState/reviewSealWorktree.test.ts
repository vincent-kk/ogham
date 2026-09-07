import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleReviewState } from '../../../../mcp/tools/reviewState/index.js';

import { completeIncrementalReview } from './helpers/completeIncrementalReview.js';
import { configureReviewGroups } from './helpers/configureReviewGroups.js';
import { createReviewStateSealFixture } from './helpers/createReviewStateSealFixture.js';
import { readPreparedReviewState } from './helpers/readPreparedReviewState.js';

/** Completed committed-source opinions whose worktree can change independently. */
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

describe('seal current worktree', () => {
  it.each([
    { path: 'src/value.ts', classification: 'source-dirty' },
    { path: 'new-source.ts', classification: 'source-dirty' },
    { path: 'DETAIL.md', classification: 'documents-only' },
  ])(
    'records $classification created after prepare at $path',
    async ({ path, classification }) => {
      const prepared = await handleReviewState({
        action: 'prepare',
        projectRoot: fixture.projectRoot,
        effort: 'low',
      });
      await completeIncrementalReview(fixture.projectRoot);
      writeFileSync(join(fixture.projectRoot, path), 'Changed after review.\n');
      const sealed = await handleReviewState({
        action: 'seal',
        projectRoot: fixture.projectRoot,
      });
      expect(sealed.summary.verdict).toBe('INCONCLUSIVE');
      const state = readPreparedReviewState(prepared);
      expect(state.scope.worktree).toBe(classification);
      expect(state.scope.dirtyPaths).toContain(path);
      expect(readFileSync(sealed.data.reportPath!, 'utf8')).toContain(
        classification,
      );
    },
  );

  it.each([false, true])(
    'classifies generated changes with documents=%s and excludes review artifacts',
    async (withDocuments) => {
      const configPath = join(fixture.projectRoot, '.filid/config.json');
      const config = JSON.parse(readFileSync(configPath, 'utf8'));
      config.structure = { generatedPaths: ['generated'] };
      writeFileSync(configPath, JSON.stringify(config));
      const prepared = await handleReviewState({
        action: 'prepare',
        projectRoot: fixture.projectRoot,
        effort: 'low',
      });
      await completeIncrementalReview(fixture.projectRoot);
      mkdirSync(join(fixture.projectRoot, 'generated'));
      writeFileSync(
        join(fixture.projectRoot, 'generated/runtime.js'),
        'generated\n',
      );
      if (withDocuments)
        writeFileSync(
          join(fixture.projectRoot, 'generated/DETAIL.md'),
          'Changed contract.\n',
        );
      writeFileSync(
        join(fixture.projectRoot, '.git/info/exclude'),
        '.filid/config.json\n',
      );
      const sealed = await handleReviewState({
        action: 'seal',
        projectRoot: fixture.projectRoot,
      });
      expect(sealed.summary.verdict).toBe(
        withDocuments ? 'INCONCLUSIVE' : 'APPROVED',
      );
      const state = readPreparedReviewState(prepared);
      expect(state.scope.worktree).toBe(
        withDocuments ? 'documents-only' : 'generated-only',
      );
      expect(state.scope.dirtyPaths).toEqual(
        withDocuments
          ? ['generated/DETAIL.md', 'generated/runtime.js']
          : ['generated/runtime.js'],
      );
    },
  );

  it('preserves a sealed cache and returns stale after a new dirty path', async () => {
    const prepared = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      effort: 'low',
    });
    await completeIncrementalReview(fixture.projectRoot);
    const sealed = await handleReviewState({
      action: 'seal',
      projectRoot: fixture.projectRoot,
    });
    expect(sealed.summary.verdict).toBe('APPROVED');
    const paths = [
      prepared.data.statePath,
      sealed.data.reportPath!,
      prepared.data.sessionPath,
    ];
    const bytes = paths.map((path) => readFileSync(path, 'utf8'));
    writeFileSync(
      join(fixture.projectRoot, 'src/value.ts'),
      'export const value = 99;\n',
    );
    const repeated = await handleReviewState({
      action: 'seal',
      projectRoot: fixture.projectRoot,
    });
    expect(repeated.summary.disposition).toBe('stale');
    expect(repeated.summary.verdict).toBeUndefined();
    expect(repeated.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'review-worktree-stale' }),
    );
    expect(paths.map((path) => readFileSync(path, 'utf8'))).toEqual(bytes);
  });
});
