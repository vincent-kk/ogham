import { rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleReviewState } from '../../../../mcp/tools/reviewState/index.js';
import { checkReviewOpinion } from '../../../../mcp/tools/reviewState/opinion/checkReviewOpinion.js';
import { parseReviewOpinion } from '../../../../mcp/tools/reviewState/opinion/parseReviewOpinion.js';

import { buildReviewOpinion } from './helpers/buildReviewOpinion.js';
import { configureReviewGroups } from './helpers/configureReviewGroups.js';
import {
  type ReviewStateSealFixture,
  createReviewStateSealFixture,
} from './helpers/createReviewStateSealFixture.js';
import { readPreparedReviewState } from './helpers/readPreparedReviewState.js';

/** Public validation fixture keeps audit requirements separate from discovery quality. */
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

describe('review inspection evidence', () => {
  it.each([
    {
      name: 'empty checked',
      review: {},
      checked: [],
      riskPlan: null,
      code: 'checked-invalid',
    },
    {
      name: 'blank checked',
      review: {},
      checked: ['  '],
      riskPlan: null,
      code: 'checked-invalid',
    },
    {
      name: 'blank entry beside evidence',
      review: {},
      checked: ['src/value.ts', ' '],
      riskPlan: null,
      code: 'checked-invalid',
    },
    {
      name: 'risk requires plan',
      review: { highRiskPaths: ['src/value.ts'] },
      checked: ['src/value.ts'],
      riskPlan: null,
      code: 'risk-plan-required',
    },
    {
      name: 'churn requires plan',
      review: { planChurnLimit: 1 },
      checked: ['src/value.ts'],
      riskPlan: null,
      code: 'risk-plan-required',
    },
    {
      name: 'blank plan',
      review: { highRiskPaths: ['src/value.ts'] },
      checked: ['src/value.ts'],
      riskPlan: ' ',
      code: 'field-empty',
    },
    {
      name: 'ordinary completion',
      review: {},
      checked: ['src/value.ts'],
      riskPlan: null,
      code: null,
    },
    {
      name: 'risk completion',
      review: { highRiskPaths: ['src/value.ts'] },
      checked: ['src/value.ts'],
      riskPlan: 'Check caller expectations.',
      code: null,
    },
  ])('$name', async ({ review, checked, riskPlan, code }) => {
    configureReviewGroups(fixture.projectRoot, 1, review);
    const prepared = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      effort: 'low',
    });
    const state = readPreparedReviewState(prepared);
    const group = state.groups[0]!;
    const opinion = { ...buildReviewOpinion(state, group), checked, riskPlan };
    writeFileSync(
      join(prepared.data.reviewDirectory, group.skeletonPath),
      JSON.stringify(opinion),
    );
    const result = await handleReviewState({
      action: 'validate',
      projectRoot: fixture.projectRoot,
      kind: 'review',
      group: group.id,
      round: 1,
    });
    expect(result.summary.ok).toBe(code === null);
    if (code)
      expect(result.data.problems).toContainEqual(
        expect.objectContaining({ code }),
      );
    else
      expect(
        (
          await handleReviewState({
            action: 'seal',
            projectRoot: fixture.projectRoot,
          })
        ).summary.verdict,
      ).toBe('APPROVED');
  });

  it('keeps an unreadable-source gap inconclusive without forcing audit placeholders', async () => {
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
    const opinion = {
      ...buildReviewOpinion(state, group),
      state: 'INDETERMINATE',
      checked: [],
      riskPlan: null,
      gaps: [
        {
          path: 'src/value.ts',
          rule: 'DEF-1',
          detail: 'Consumer evidence is unavailable.',
        },
      ],
    };
    writeFileSync(
      join(prepared.data.reviewDirectory, group.skeletonPath),
      JSON.stringify(opinion),
    );
    const result = await handleReviewState({
      action: 'validate',
      projectRoot: fixture.projectRoot,
      kind: 'review',
      group: group.id,
      round: 1,
    });
    expect(result.summary).toMatchObject({ ok: true, nextRound: null });
    expect(
      (
        await handleReviewState({
          action: 'seal',
          projectRoot: fixture.projectRoot,
        })
      ).summary.verdict,
    ).toBe('INCONCLUSIVE');
  });

  it('allows candidate-only automatic opinions without invented inspection records', async () => {
    configureReviewGroups(fixture.projectRoot, 1);
    const prepared = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
    });
    const state = readPreparedReviewState(prepared);
    const group = { ...state.groups[0]!, units: [], rounds: 0 };
    const parsed = parseReviewOpinion(
      JSON.stringify({
        ...buildReviewOpinion(state, group, 0),
        checked: [],
        riskPlan: null,
      }),
    );
    expect(parsed.opinion).not.toBeNull();
    expect(
      checkReviewOpinion(
        parsed.opinion!,
        {
          group: group.id,
          round: 0,
          sourceHash: state.sourceHash,
          units: [],
          policy: group,
        },
        [],
      ),
    ).toBe(true);
  });
});
