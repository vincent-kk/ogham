import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { computeReviewArtifactHash } from '../../../../mcp/tools/reviewState/hash/computeReviewArtifactHash.js';
import { handleReviewState } from '../../../../mcp/tools/reviewState/index.js';

import { buildReviewOpinion } from './helpers/buildReviewOpinion.js';
import { configureReviewGroups } from './helpers/configureReviewGroups.js';
import {
  type ReviewStateSealFixture,
  createReviewStateSealFixture,
} from './helpers/createReviewStateSealFixture.js';
import { readPreparedReviewState } from './helpers/readPreparedReviewState.js';

/** Corrupted artifacts exercise semantic checks independently of their hash bindings. */
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

describe('review quality through recovery and seal', () => {
  it.each(['checked', 'riskPlan'] as const)(
    'does not borrow prior %s to validate an incomplete raw follow-up',
    async (field) => {
      configureReviewGroups(fixture.projectRoot, 1, {
        highRiskPaths: ['src/value.ts'],
      });
      const prepared = await handleReviewState({
        action: 'prepare',
        projectRoot: fixture.projectRoot,
        effort: 'medium',
      });
      const state = readPreparedReviewState(prepared);
      const group = state.groups[0]!;
      writeFileSync(
        join(prepared.data.reviewDirectory, group.skeletonPath),
        JSON.stringify(buildReviewOpinion(state, group)),
      );
      const first = await handleReviewState({
        action: 'validate',
        projectRoot: fixture.projectRoot,
        kind: 'review',
        group: group.id,
        round: 1,
      });
      expect(first.summary).toMatchObject({ ok: true, nextRound: 2 });
      const canonical = join(prepared.data.reviewDirectory, group.opinionPath);
      const before = readFileSync(canonical, 'utf8');
      const second = buildReviewOpinion(state, group, 2);
      second[field] = field === 'checked' ? [] : null;
      writeFileSync(
        join(
          prepared.data.reviewDirectory,
          `opinions/review-${group.id}.r2.json`,
        ),
        JSON.stringify(second),
      );
      const result = await handleReviewState({
        action: 'validate',
        projectRoot: fixture.projectRoot,
        kind: 'review',
        group: group.id,
        round: 2,
      });
      expect(result.summary.ok).toBe(false);
      expect(result.data.problems).toContainEqual(
        expect.objectContaining({
          code: field === 'checked' ? 'checked-invalid' : 'risk-plan-required',
        }),
      );
      expect(readFileSync(canonical, 'utf8')).toBe(before);
    },
  );

  it('refuses to rebuild a trusted merged opinion from a raw round missing inspection records', async () => {
    configureReviewGroups(fixture.projectRoot, 1);
    const prepared = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      effort: 'low',
    });
    const state = readPreparedReviewState(prepared);
    const group = state.groups[0]!;
    const rawPath = join(prepared.data.reviewDirectory, group.skeletonPath);
    writeFileSync(rawPath, JSON.stringify(buildReviewOpinion(state, group)));
    await handleReviewState({
      action: 'validate',
      projectRoot: fixture.projectRoot,
      kind: 'review',
      group: group.id,
      round: 1,
    });
    const invalid = JSON.stringify({
      ...buildReviewOpinion(state, group),
      checked: [],
    });
    writeFileSync(rawPath, invalid);
    rmSync(join(prepared.data.reviewDirectory, group.opinionPath));
    await expect(
      handleReviewState({
        action: 'prepare',
        projectRoot: fixture.projectRoot,
        effort: 'low',
      }),
    ).rejects.toMatchObject({ code: 'review-opinion-invalid' });
    expect(readFileSync(rawPath, 'utf8')).toBe(invalid);
  });

  it.each(['checked', 'riskPlan'] as const)(
    'does not seal a semantically invalid %s even with matching artifact hashes',
    async (field) => {
      configureReviewGroups(fixture.projectRoot, 1, {
        highRiskPaths: ['src/value.ts'],
      });
      const prepared = await handleReviewState({
        action: 'prepare',
        projectRoot: fixture.projectRoot,
        effort: 'low',
      });
      const state = readPreparedReviewState(prepared);
      const group = state.groups[0]!;
      writeFileSync(
        join(prepared.data.reviewDirectory, group.skeletonPath),
        JSON.stringify(buildReviewOpinion(state, group)),
      );
      await handleReviewState({
        action: 'validate',
        projectRoot: fixture.projectRoot,
        kind: 'review',
        group: group.id,
        round: 1,
      });
      const valid = readPreparedReviewState(prepared);
      const opinion = buildReviewOpinion(valid, group);
      opinion[field] = field === 'checked' ? [] : null;
      const bytes = JSON.stringify(opinion);
      writeFileSync(
        join(prepared.data.reviewDirectory, group.opinionPath),
        bytes,
      );
      valid.groups[0]!.validated.review!.sha256 =
        computeReviewArtifactHash(bytes);
      valid.groups[0]!.validated.verify!.reviewSha256 =
        computeReviewArtifactHash(bytes);
      writeFileSync(prepared.data.statePath, JSON.stringify(valid));
      const checkpoint = await handleReviewState({
        action: 'checkpoint',
        projectRoot: fixture.projectRoot,
      });
      expect(checkpoint.data.sealReady).toBe(false);
      expect(
        (
          await handleReviewState({
            action: 'seal',
            projectRoot: fixture.projectRoot,
          })
        ).summary.verdict,
      ).toBe('INCONCLUSIVE');
    },
  );
});
