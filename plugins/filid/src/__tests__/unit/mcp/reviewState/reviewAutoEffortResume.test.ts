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

/** Disposable repository with persisted opinions and caller-authored context. */
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

describe('automatic effort resume', () => {
  it.each([false, true])(
    'keeps legacy high on repeated implicit resumes (missing evidence=%s)',
    async (missingEvidence) => {
      configureReviewGroups(fixture.projectRoot, 1);
      const prepared = await handleReviewState({
        action: 'prepare',
        projectRoot: fixture.projectRoot,
        effort: 'high',
      });
      const legacy = readPreparedReviewState(prepared);
      delete legacy.effortMode;
      delete legacy.effortReason;
      delete legacy.autoLowEffortGroupThreshold;
      writeFileSync(prepared.data.statePath, JSON.stringify(legacy));
      if (missingEvidence) rmSync(prepared.data.evidencePath);
      for (const attempt of [1, 2]) {
        const result = await handleReviewState({
          action: 'prepare',
          projectRoot: fixture.projectRoot,
        });
        expect(result.summary, `resume ${attempt}`).toMatchObject({
          effort: 'high',
          effortReason: 'legacy-resume',
          maxReviewerHandoffs: 3,
        });
      }
      const auto = await handleReviewState({
        action: 'prepare',
        projectRoot: fixture.projectRoot,
        effort: 'auto',
      });
      expect(auto.summary).toMatchObject({
        effort: 'medium',
        effortReason: 'auto-standard',
        maxReviewerHandoffs: 2,
      });
    },
  );

  it('updates metadata only while preserving caller context, briefs and completed opinions', async () => {
    configureReviewGroups(fixture.projectRoot, 1, {
      autoLowEffortGroupThreshold: 3,
    });
    const prepared = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      changeContext: 'Preserve this original caller context.',
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
    const valid = readPreparedReviewState(prepared).groups[0]!.validated;
    const brief = readFileSync(
      join(prepared.data.reviewDirectory, group.briefPath),
      'utf8',
    );
    const opinion = readFileSync(
      join(prepared.data.reviewDirectory, group.opinionPath),
      'utf8',
    );
    for (const threshold of [4, 5]) {
      configureReviewGroups(fixture.projectRoot, 1, {
        autoLowEffortGroupThreshold: threshold,
      });
      const resumed = await handleReviewState({
        action: 'prepare',
        projectRoot: fixture.projectRoot,
      });
      expect(resumed.summary).toMatchObject({
        effort: 'medium',
        autoLowEffortGroupThreshold: threshold,
      });
      expect(resumed.data.groups[0]!.validated).toEqual(valid);
      expect(
        readFileSync(
          join(prepared.data.reviewDirectory, group.briefPath),
          'utf8',
        ),
      ).toBe(brief);
      expect(
        readFileSync(
          join(prepared.data.reviewDirectory, group.opinionPath),
          'utf8',
        ),
      ).toBe(opinion);
      const session = readFileSync(prepared.data.sessionPath, 'utf8');
      expect(session).toContain('Preserve this original caller context.');
      for (const key of [
        'effort_mode',
        'effort_reason',
        'auto_low_effort_group_threshold',
        'reviewable_groups',
        'max_reviewer_handoffs',
      ])
        expect(
          session.split('\n').filter((line) => line.startsWith(`${key}:`)),
        ).toHaveLength(1);
    }
  });

  it('retunes auto thresholds without changing group identity or validated opinions', async () => {
    configureReviewGroups(fixture.projectRoot, 1, {
      highRiskPaths: ['src/value.ts'],
      autoLowEffortGroupThreshold: 2,
    });
    const prepared = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
    });
    const state = readPreparedReviewState(prepared);
    const group = state.groups[0]!;
    writeFileSync(
      join(prepared.data.reviewDirectory, group.skeletonPath),
      JSON.stringify(buildReviewOpinion(state, group)),
    );
    const validated = await handleReviewState({
      action: 'validate',
      projectRoot: fixture.projectRoot,
      kind: 'review',
      group: group.id,
      round: 1,
    });
    expect(validated.summary).toMatchObject({ nextRound: 2 });
    const opinion = readFileSync(
      join(prepared.data.reviewDirectory, group.opinionPath),
      'utf8',
    );
    configureReviewGroups(fixture.projectRoot, 1, {
      autoLowEffortGroupThreshold: 1,
    });
    const resumed = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
    });
    expect(resumed.summary).toMatchObject({
      effort: 'low',
      effortReason: 'auto-large',
    });
    expect(resumed.data.groups[0]).toMatchObject({
      id: group.id,
      units: group.units,
      rounds: 1,
      riskReasons: group.riskReasons,
      validated: { review: { round: 1, complete: true } },
    });
    expect(resumed.data.next).toEqual([]);
    expect(
      readFileSync(
        join(prepared.data.reviewDirectory, group.opinionPath),
        'utf8',
      ),
    ).toBe(opinion);
  });

  it('leaves a sealed cache untouched despite explicit policy changes', async () => {
    configureReviewGroups(fixture.projectRoot, 1);
    const prepared = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
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
    await handleReviewState({
      action: 'seal',
      projectRoot: fixture.projectRoot,
    });
    const stateBytes = readFileSync(prepared.data.statePath, 'utf8');
    const sessionBytes = readFileSync(prepared.data.sessionPath, 'utf8');
    const cached = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      effort: 'high',
    });
    expect(cached.summary.disposition).toBe('cached');
    expect(cached.data.next).toEqual([]);
    expect(readFileSync(prepared.data.statePath, 'utf8')).toBe(stateBytes);
    expect(readFileSync(prepared.data.sessionPath, 'utf8')).toBe(sessionBytes);
  });
});
