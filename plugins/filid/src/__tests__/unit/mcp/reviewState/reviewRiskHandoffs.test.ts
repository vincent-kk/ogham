import { readFileSync, rmSync } from 'node:fs';

import { portableJoin, writeFileAtomicallySync } from '@ogham/cross-platform';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleReviewState } from '../../../../mcp/tools/reviewState/index.js';

import { buildReviewOpinion } from './helpers/buildReviewOpinion.js';
import { buildReviewStateSealFinding } from './helpers/buildReviewStateSealFinding.js';
import {
  type ReviewStateSealFixture,
  createReviewStateSealFixture,
} from './helpers/createReviewStateSealFixture.js';
import { readPreparedReviewState } from './helpers/readPreparedReviewState.js';
import { runReviewStateFixtureGit } from './helpers/runReviewStateFixtureGit.js';
import { writeReviewStateFixtureFile } from './helpers/writeReviewStateFixtureFile.js';

/** Real prepared repository used to check risk routing across action boundaries. */
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

describe('risk-sensitive review handoffs', () => {
  it.each([
    ['src/authGuard.ts', 'security-path'],
    ['src/index.ts', 'public-boundary'],
  ])(
    'collects automatic risk evidence for %s through fresh prepare',
    async (path, kind) => {
      writeReviewStateFixtureFile(
        fixture.projectRoot,
        path!,
        "export { value } from './value.js';\n",
      );
      runReviewStateFixtureGit(fixture.projectRoot, ['add', '--all']);
      runReviewStateFixtureGit(fixture.projectRoot, [
        'commit',
        '-m',
        'Add a review boundary',
      ]);
      const prepared = await handleReviewState({
        action: 'prepare',
        projectRoot: fixture.projectRoot,
        effort: 'medium',
      });
      const state = readPreparedReviewState(prepared);
      const group = state.groups.find((item) =>
        item.units.some((unit) => unit.path === path),
      )!;
      expect(group.riskReasons).toContain(`${kind}: ${path}`);
      expect(
        prepared.data.next.find((handoff) => handoff.group === group.id),
      ).toMatchObject({
        modelTier: 'efficient',
        riskReasons: group.riskReasons,
      });
    },
  );

  it.each([false, true])(
    'preserves prepared risk when settings change (missing evidence=%s)',
    async (missingEvidence) => {
      const config = {
        version: '2.0',
        adapters: { mode: 'auto', enabled: [] },
        rules: {},
        review: { highRiskPaths: [] as string[] },
      };
      writeReviewStateFixtureFile(
        fixture.projectRoot,
        '.filid/config.json',
        JSON.stringify(config),
      );
      runReviewStateFixtureGit(fixture.projectRoot, ['add', '--all']);
      runReviewStateFixtureGit(fixture.projectRoot, [
        'commit',
        '-m',
        'Configure risk policy',
      ]);
      const prepared = await handleReviewState({
        action: 'prepare',
        projectRoot: fixture.projectRoot,
        effort: 'medium',
      });
      expect(prepared.data.groups[0]!.riskReasons).toEqual([]);
      config.review.highRiskPaths = ['src/value.ts'];
      writeReviewStateFixtureFile(
        fixture.projectRoot,
        '.filid/config.json',
        JSON.stringify(config),
      );
      if (missingEvidence)
        rmSync(portableJoin(prepared.data.reviewDirectory, 'evidence.md'));
      const resumed = await handleReviewState({
        action: 'prepare',
        projectRoot: fixture.projectRoot,
        effort: 'medium',
      });
      expect(resumed.data.groups[0]!.riskReasons).toEqual([]);
    },
  );

  it.each([
    { uncertain: false, damage: 'none' },
    { uncertain: false, damage: 'evidence' },
    { uncertain: false, damage: 'opinion' },
    { uncertain: true, damage: 'none' },
    { uncertain: true, damage: 'evidence' },
    { uncertain: true, damage: 'opinion' },
  ])(
    'preserves legacy completion (uncertain=$uncertain, damage=$damage)',
    async ({ uncertain, damage }) => {
      const prepared = await handleReviewState({
        action: 'prepare',
        projectRoot: fixture.projectRoot,
        effort: 'medium',
      });
      const state = readPreparedReviewState(prepared);
      const group = state.groups[0]!;
      writeFileAtomicallySync(
        portableJoin(prepared.data.reviewDirectory, group.skeletonPath),
        JSON.stringify({
          ...buildReviewOpinion(state, group),
          ...(uncertain
            ? {
                state: 'INDETERMINATE',
                gaps: [
                  {
                    path: 'src/value.ts',
                    rule: 'DEF-1',
                    detail: 'Evidence remains unavailable.',
                  },
                ],
              }
            : {}),
        }),
      );
      await handleReviewState({
        action: 'validate',
        projectRoot: fixture.projectRoot,
        kind: 'review',
        group: group.id,
        round: 1,
      });
      const legacy = readPreparedReviewState(prepared);
      legacy.groups[0]!.validated.review!.complete = true;
      for (const item of legacy.groups) delete item.riskReasons;
      for (const file of legacy.scope.files) delete file.publicEntryPoint;
      writeFileAtomicallySync(prepared.data.statePath, JSON.stringify(legacy));
      if (damage !== 'none')
        rmSync(
          portableJoin(
            prepared.data.reviewDirectory,
            damage === 'evidence' ? 'evidence.md' : group.opinionPath,
          ),
        );
      const resumed = await handleReviewState({
        action: 'prepare',
        projectRoot: fixture.projectRoot,
        effort: 'medium',
      });
      expect(resumed.data.next).toEqual([]);
      expect(resumed.data.groups[0]!.validated.review).toEqual(
        legacy.groups[0]!.validated.review,
      );
    },
  );

  it.each([
    { initial: 'medium', reduced: 'low', completedRound: 1 },
    { initial: 'high', reduced: 'medium', completedRound: 2 },
  ] as const)(
    'closes pending work when effort is reduced from $initial to $reduced',
    async ({ initial, reduced, completedRound }) => {
      writeReviewStateFixtureFile(
        fixture.projectRoot,
        'src/authGuard.ts',
        "export { value } from './value.js';\n",
      );
      runReviewStateFixtureGit(fixture.projectRoot, ['add', '--all']);
      runReviewStateFixtureGit(fixture.projectRoot, [
        'commit',
        '-m',
        'Add risk review scope',
      ]);
      const prepared = await handleReviewState({
        action: 'prepare',
        projectRoot: fixture.projectRoot,
        effort: initial,
      });
      const state = readPreparedReviewState(prepared);
      const group = state.groups[0]!;
      for (let round = 1; round <= completedRound; round += 1) {
        writeFileAtomicallySync(
          portableJoin(
            prepared.data.reviewDirectory,
            `opinions/review-${group.id}.r${round}.json`,
          ),
          JSON.stringify({
            ...buildReviewOpinion(state, group, round),
            findings:
              round === 2 ? [buildReviewStateSealFinding(group.id)] : [],
          }),
        );
        const validated = await handleReviewState({
          action: 'validate',
          projectRoot: fixture.projectRoot,
          kind: 'review',
          group: group.id,
          round,
        });
        expect(validated.summary).toMatchObject({
          ok: true,
          nextRound: round + 1,
        });
      }
      const canonical = readFileSync(
        portableJoin(prepared.data.reviewDirectory, group.opinionPath),
        'utf8',
      );
      const resumed = await handleReviewState({
        action: 'prepare',
        projectRoot: fixture.projectRoot,
        effort: reduced,
      });
      expect(resumed.data.groups[0]!.rounds).toBe(completedRound);
      expect(resumed.data.groups[0]!.validated.review).toMatchObject({
        round: completedRound,
        complete: true,
      });
      expect(
        resumed.data.next.map((handoff) => ({
          kind: handoff.kind,
          modelTier: handoff.modelTier,
        })),
      ).toEqual(
        completedRound === 1
          ? []
          : [{ kind: 'verify', modelTier: 'efficient' }],
      );
      expect(
        readFileSync(
          portableJoin(prepared.data.reviewDirectory, group.opinionPath),
          'utf8',
        ),
      ).toBe(canonical);
    },
  );

  it.each([
    { effort: 'medium', risk: true, uncertain: false, followup: true },
    { effort: 'high', risk: true, uncertain: false, followup: true },
    { effort: 'low', risk: true, uncertain: false, followup: false },
    { effort: 'medium', risk: false, uncertain: false, followup: false },
    { effort: 'medium', risk: false, uncertain: true, followup: true },
    { effort: 'high', risk: false, uncertain: true, followup: true },
    { effort: 'low', risk: false, uncertain: true, followup: false },
  ] as const)(
    '$effort risk=$risk uncertain=$uncertain routes within its budget',
    async ({ effort, risk, uncertain, followup }) => {
      if (risk) {
        writeReviewStateFixtureFile(
          fixture.projectRoot,
          '.filid/config.json',
          JSON.stringify({
            version: '2.0',
            adapters: { mode: 'auto', enabled: [] },
            rules: {},
            review: { highRiskPaths: ['src/value.ts'] },
          }),
        );
        runReviewStateFixtureGit(fixture.projectRoot, ['add', '--all']);
        runReviewStateFixtureGit(fixture.projectRoot, [
          'commit',
          '-m',
          'Configure review risk',
        ]);
      }
      const prepared = await handleReviewState({
        action: 'prepare',
        projectRoot: fixture.projectRoot,
        effort,
      });
      const state = readPreparedReviewState(prepared);
      const group = state.groups[0]!;
      const reasons = risk ? ['configured-path: src/value.ts'] : [];
      expect(group.riskReasons).toEqual(reasons);
      expect(prepared.data.next[0]).toMatchObject({
        kind: 'review',
        round: 1,
        modelTier: risk && effort === 'low' ? 'strong' : 'efficient',
        riskReasons: reasons,
      });
      const checkpoint = await handleReviewState({
        action: 'checkpoint',
        projectRoot: fixture.projectRoot,
      });
      expect(checkpoint.data.next).toEqual(prepared.data.next);
      for (const round of followup ? [1, 2] : [1]) {
        writeFileAtomicallySync(
          portableJoin(
            prepared.data.reviewDirectory,
            `opinions/review-${group.id}.r${round}.json`,
          ),
          JSON.stringify({
            ...buildReviewOpinion(state, group, round),
            ...(uncertain
              ? {
                  state: 'INDETERMINATE',
                  gaps: [
                    {
                      path: 'src/value.ts',
                      rule: 'DEF-1',
                      detail: 'Consumer evidence is unavailable.',
                    },
                  ],
                }
              : {}),
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
        expect(result.summary).toMatchObject({
          nextRound: round === 1 && followup ? 2 : null,
        });
        expect(result.data.next).toMatchObject(
          round === 1 && followup
            ? [
                {
                  kind: 'review',
                  round: 2,
                  modelTier: 'strong',
                  riskReasons: reasons,
                },
              ]
            : [],
        );
      }
      const finalState = readPreparedReviewState(prepared);
      const opinionPath = portableJoin(
        prepared.data.reviewDirectory,
        group.opinionPath,
      );
      const canonical = readFileSync(opinionPath, 'utf8');
      rmSync(opinionPath);
      const resumed = await handleReviewState({
        action: 'prepare',
        projectRoot: fixture.projectRoot,
        effort,
      });
      expect(resumed.data.next).toEqual([]);
      expect(resumed.data.groups[0]!.riskReasons).toEqual(reasons);
      expect(resumed.data.groups[0]!.validated.review).toEqual(
        finalState.groups[0]!.validated.review,
      );
      expect(readFileSync(opinionPath, 'utf8')).toBe(canonical);
    },
  );

  it('keeps the verifier efficient after an error-triggered strong follow-up', async () => {
    const prepared = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      effort: 'medium',
    });
    const state = readPreparedReviewState(prepared);
    const group = state.groups[0]!;
    for (const round of [1, 2]) {
      writeFileAtomicallySync(
        portableJoin(
          prepared.data.reviewDirectory,
          `opinions/review-${group.id}.r${round}.json`,
        ),
        JSON.stringify({
          ...buildReviewOpinion(state, group, round),
          findings: round === 1 ? [buildReviewStateSealFinding(group.id)] : [],
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
      expect(result.data.next).toMatchObject([
        {
          kind: round === 1 ? 'review' : 'verify',
          modelTier: round === 1 ? 'strong' : 'efficient',
        },
      ]);
    }
  });
});
