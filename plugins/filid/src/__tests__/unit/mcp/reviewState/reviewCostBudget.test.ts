import { rmSync } from 'node:fs';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleReviewState } from '../../../../mcp/tools/reviewState/index.js';

import {
  type ReviewStateSealFixture,
  createReviewStateSealFixture,
} from './helpers/createReviewStateSealFixture.js';
import { runReviewStateFixtureGit } from './helpers/runReviewStateFixtureGit.js';
import { writeReviewStateFixtureFile } from './helpers/writeReviewStateFixtureFile.js';

/** Temporary repository whose real prepare action enforces the review budget. */
let fixture: ReviewStateSealFixture;

beforeEach(() => {
  fixture = createReviewStateSealFixture();
});
afterEach(() => {
  rmSync(fixture.projectRoot, { recursive: true, force: true });
  rmSync(fixture.pluginRoot, { recursive: true, force: true });
  if (fixture.originalPluginRoot === undefined)
    delete process.env.CLAUDE_PLUGIN_ROOT;
  else process.env.CLAUDE_PLUGIN_ROOT = fixture.originalPluginRoot;
});

describe('prepare review cost budget', () => {
  it('keeps a 941-line addition within one default group without chunking', async () => {
    writeReviewStateFixtureFile(
      fixture.projectRoot,
      'src/large.ts',
      '// changed line\n'.repeat(941),
    );
    runReviewStateFixtureGit(fixture.projectRoot, ['add', '--all']);
    runReviewStateFixtureGit(fixture.projectRoot, [
      'commit',
      '-m',
      'Add review scope',
    ]);
    const result = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      baseRef: 'main',
    });
    expect(result.status).toBe('ok');
    expect(result.data.groups).toHaveLength(1);
    expect(
      result.data.groups[0]!.units.every((unit) => unit.chunk === null),
    ).toBe(true);
  });

  it.each([false, true])(
    'rejects an exceeded budget before handing off actors (resume=%s)',
    async (resume) => {
      const config = {
        version: '2.0',
        adapters: { mode: 'auto', enabled: [] },
        rules: {},
        review: { groupFileLimit: 1, maxGroups: resume ? 10 : 1 },
      };
      writeReviewStateFixtureFile(
        fixture.projectRoot,
        '.filid/config.json',
        JSON.stringify(config),
      );
      writeReviewStateFixtureFile(
        fixture.projectRoot,
        'src/another.ts',
        'export const another = 1;\n',
      );
      runReviewStateFixtureGit(fixture.projectRoot, ['add', '--all']);
      runReviewStateFixtureGit(fixture.projectRoot, [
        'commit',
        '-m',
        'Configure review budget',
      ]);
      if (resume) {
        const initial = await handleReviewState({
          action: 'prepare',
          projectRoot: fixture.projectRoot,
          baseRef: 'main',
        });
        expect(initial.status).toBe('ok');
        expect(initial.data.groups.length).toBeGreaterThan(1);
        config.review.maxGroups = 1;
        writeReviewStateFixtureFile(
          fixture.projectRoot,
          '.filid/config.json',
          JSON.stringify(config),
        );
      }
      await expect(
        handleReviewState({
          action: 'prepare',
          projectRoot: fixture.projectRoot,
          baseRef: 'main',
        }),
      ).rejects.toThrow('review group budget exceeded');
    },
  );
});
