import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleReviewState } from '../../../../mcp/tools/reviewState/index.js';

import { buildReviewOpinion } from './helpers/buildReviewOpinion.js';
import { buildVerdictReviewFinding } from './helpers/buildVerdictReviewFinding.js';
import { configureReviewGroups } from './helpers/configureReviewGroups.js';
import { createReviewStateSealFixture } from './helpers/createReviewStateSealFixture.js';
import { readPreparedReviewState } from './helpers/readPreparedReviewState.js';

/** Isolated round artifacts and Git source used to prove stale-call immutability. */
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

describe('review round order', () => {
  it.each([
    { effort: 'medium' as const, rounds: 2, stale: 1 },
    { effort: 'high' as const, rounds: 3, stale: 2 },
  ])(
    'preserves all evidence when round $stale is repeated after $rounds',
    async ({ effort, rounds, stale }) => {
      const excerpts = [
        'export const value = 2;',
        'export const second = 3;',
        'export const third = 4;',
      ];
      writeFileSync(
        join(fixture.projectRoot, 'src/value.ts'),
        excerpts.join('\n') + '\n',
      );
      execFileSync(
        'git',
        ['commit', '-am', 'Prepare independent round findings', '-q'],
        {
          cwd: fixture.projectRoot,
        },
      );
      const prepared = await handleReviewState({
        action: 'prepare',
        projectRoot: fixture.projectRoot,
        effort,
      });
      const state = readPreparedReviewState(prepared);
      const group = state.groups[0]!;
      const rawPaths = Array.from({ length: rounds }, (_, index) =>
        join(
          prepared.data.reviewDirectory,
          `opinions/review-${group.id}.r${index + 1}.json`,
        ),
      );
      for (let round = 1; round <= rounds; round++) {
        writeFileSync(
          rawPaths[round - 1]!,
          JSON.stringify({
            ...buildReviewOpinion(state, group, round),
            findings: [
              buildVerdictReviewFinding({
                id: `R${group.id}-001`,
                path: 'src/value.ts',
                existingCode: excerpts[round - 1]!,
              }),
            ],
          }),
        );
        const result = await handleReviewState({
          action: 'validate',
          projectRoot: fixture.projectRoot,
          kind: 'review',
          group: group.id,
          round,
        });
        expect(result.summary.ok).toBe(true);
      }
      const mergedPath = join(prepared.data.reviewDirectory, group.opinionPath);
      expect(
        JSON.parse(readFileSync(mergedPath, 'utf8')).findings,
      ).toHaveLength(rounds);
      const paths = [
        ...rawPaths,
        mergedPath,
        prepared.data.statePath,
        join(prepared.data.reviewDirectory, group.verifyBriefPath),
      ];
      const bytes = paths.map((path) => readFileSync(path, 'utf8'));
      await expect(
        handleReviewState({
          action: 'validate',
          projectRoot: fixture.projectRoot,
          kind: 'review',
          group: group.id,
          round: stale,
        }),
      ).rejects.toThrow(/out of order/);
      expect(paths.map((path) => readFileSync(path, 'utf8'))).toEqual(bytes);
      const repeated = await handleReviewState({
        action: 'validate',
        projectRoot: fixture.projectRoot,
        kind: 'review',
        group: group.id,
        round: rounds,
      });
      expect(repeated.summary.ok).toBe(true);
      expect(
        JSON.parse(readFileSync(mergedPath, 'utf8')).findings,
      ).toHaveLength(rounds);
      expect(rawPaths.map((path) => readFileSync(path, 'utf8'))).toEqual(
        bytes.slice(0, rounds),
      );
    },
  );
});
