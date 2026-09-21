import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleReviewState } from '../../../../mcp/tools/reviewState/index.js';

import { buildReviewOpinion } from './helpers/buildReviewOpinion.js';
import { configureReviewGroups } from './helpers/configureReviewGroups.js';
import {
  type ReviewStateSealFixture,
  createReviewStateSealFixture,
} from './helpers/createReviewStateSealFixture.js';
import { readPreparedReviewState } from './helpers/readPreparedReviewState.js';

/** Disposable repository isolates handoff and artifact preservation checks. */
let fixture: ReviewStateSealFixture;
beforeEach(async () => {
  fixture = await createReviewStateSealFixture();
});
afterEach(() => {
  rmSync(fixture.projectRoot, { recursive: true, force: true });
  rmSync(fixture.pluginRoot, { recursive: true, force: true });
  if (fixture.originalPluginRoot === undefined)
    delete process.env.CLAUDE_PLUGIN_ROOT;
  else process.env.CLAUDE_PLUGIN_ROOT = fixture.originalPluginRoot;
});

describe('prepared effort lock', () => {
  it.each([
    ['medium', 'low'],
    ['low', 'medium'],
    ['high', 'low'],
  ] as const)(
    'opens a new generation from %s when the argument names %s',
    async (effort, requested) => {
      await configureReviewGroups(fixture.projectRoot, 1, {
        highRiskPaths: ['src/value.ts'],
      });
      const prepared = await handleReviewState({
        action: 'prepare',
        projectRoot: fixture.projectRoot,
        effort,
      });
      const sessionBytes = readFileSync(prepared.data.sessionPath, 'utf8');
      const reprepared = await handleReviewState({
        action: 'prepare',
        projectRoot: fixture.projectRoot,
        effort: requested,
      });
      expect(readPreparedReviewState(reprepared).effort).toBe(requested);
      expect(reprepared.summary.generationId).not.toBe(
        prepared.summary.generationId,
      );
      expect(readFileSync(prepared.data.sessionPath, 'utf8')).toBe(
        sessionBytes,
      );
    },
  );

  it.each([false, true])(
    'preserves pending strong review across threshold changes (missing evidence=%s)',
    async (missingEvidence) => {
      await configureReviewGroups(fixture.projectRoot, 1, {
        highRiskPaths: ['src/value.ts'],
        autoLowEffortGroupThreshold: 2,
      });
      const prepared = await handleReviewState({
        action: 'prepare',
        projectRoot: fixture.projectRoot,
      });
      const state = readPreparedReviewState(prepared);
      const group = state.groups[0]!;
      expect(prepared.data.next[0]).toMatchObject({
        modelTier: 'efficient',
        round: 1,
      });
      const opinion = buildReviewOpinion(state, group);
      opinion.riskPlan = 'Check the changed value against callers.';
      writeFileSync(
        join(prepared.data.reviewDirectory, group.skeletonPath),
        JSON.stringify(opinion),
      );
      const valid = await handleReviewState({
        action: 'validate',
        projectRoot: fixture.projectRoot,
        kind: 'review',
        group: group.id,
        round: 1,
      });
      expect(valid.data.next).toContainEqual(
        expect.objectContaining({
          kind: 'review',
          round: 2,
          modelTier: 'strong',
        }),
      );
      if (missingEvidence) rmSync(prepared.data.evidencePath);
      const paths = [
        join(prepared.data.reviewDirectory, group.briefPath),
        join(prepared.data.reviewDirectory, group.opinionPath),
      ];
      const before = paths.map((path) => readFileSync(path, 'utf8'));
      await configureReviewGroups(fixture.projectRoot, 1, {
        highRiskPaths: ['src/value.ts'],
        autoLowEffortGroupThreshold: 1,
        effort: 'low',
      });
      const resumed = await handleReviewState({
        action: 'prepare',
        projectRoot: fixture.projectRoot,
      });
      expect(paths.map((path) => readFileSync(path, 'utf8'))).toEqual(before);
      expect(readPreparedReviewState(resumed).effort).toBe(
        readPreparedReviewState(prepared).effort,
      );
      expect(readFileSync(prepared.data.sessionPath, 'utf8')).toContain(
        'effort: medium',
      );
      expect(resumed.data.next).toContainEqual(
        expect.objectContaining({
          kind: 'review',
          round: 2,
          modelTier: 'strong',
        }),
      );
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

  it('allows explicit force to prepare a new bounded policy', async () => {
    await configureReviewGroups(fixture.projectRoot, 1, {
      highRiskPaths: ['src/value.ts'],
    });
    await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      effort: 'medium',
    });
    const fresh = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      effort: 'low',
      force: true,
    });
    expect(fresh.summary).toMatchObject({
      disposition: 'fresh',
      effort: 'low',
      maxReviewerHandoffs: 1,
      concurrency: 8,
    });
    expect(fresh.data.next[0]).toMatchObject({ modelTier: 'strong', round: 1 });
  });

  it('keeps locked effort when missing evidence recomputes a different group count', async () => {
    await configureReviewGroups(fixture.projectRoot, 2, {
      groupFileLimit: 2,
      autoLowEffortGroupThreshold: 2,
    });
    const prepared = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
    });
    expect(prepared.summary).toMatchObject({
      effort: 'medium',
      reviewableGroups: 1,
    });
    rmSync(prepared.data.evidencePath);
    await configureReviewGroups(fixture.projectRoot, 1, {
      groupFileLimit: 1,
      autoLowEffortGroupThreshold: 2,
    });
    const resumed = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
    });
    expect(resumed.summary.effort).toBe('medium');
    expect(resumed.data.groups.every((group) => group.rounds === 2)).toBe(true);
  });

  it('retains the prepared planning requirement when evidence is reconstructed', async () => {
    await configureReviewGroups(fixture.projectRoot, 1, { planChurnLimit: 1 });
    const prepared = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      effort: 'medium',
    });
    expect(prepared.data.groups[0]!.planRequired).toBe(true);
    rmSync(prepared.data.evidencePath);
    await configureReviewGroups(fixture.projectRoot, 1, { planChurnLimit: 1000 });
    const resumed = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      effort: 'medium',
    });
    expect(resumed.data.groups[0]!.planRequired).toBe(true);
  });
});
