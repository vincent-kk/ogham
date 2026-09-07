import { readFileSync, rmSync } from 'node:fs';

import { portableJoin, writeFileAtomicallySync } from '@ogham/cross-platform';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleReviewState } from '../../../../mcp/tools/reviewState/index.js';
import { resolveReviewStatePaths } from '../../../../mcp/tools/reviewState/state/resolveReviewStatePaths.js';

import { buildReviewOpinion } from './helpers/buildReviewOpinion.js';
import { buildReviewStateSealFinding } from './helpers/buildReviewStateSealFinding.js';
import {
  type ReviewStateSealFixture,
  createReviewStateSealFixture,
} from './helpers/createReviewStateSealFixture.js';
import { prepareReviewStateSealFixture } from './helpers/prepareReviewStateSealFixture.js';
import { readPreparedReviewState } from './helpers/readPreparedReviewState.js';
import { refreshReviewFixtureInputs } from './helpers/refreshReviewFixtureInputs.js';

/** Isolated repository used to exercise real round validation and handoffs. */
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

describe('cost-aware reviewer handoffs', () => {
  it.each(['medium', 'low'] as const)(
    'recovers all validated warning rounds under the %s continuation policy',
    async (effort) => {
      const prepared = await handleReviewState({
        action: 'prepare',
        projectRoot: fixture.projectRoot,
        effort: 'high',
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
            findings: [
              {
                ...buildReviewStateSealFinding(group.id),
                severity: 'warning',
                rule: `DEF-${round}`,
              },
            ],
          }),
        );
        const validated = await handleReviewState({
          action: 'validate',
          projectRoot: fixture.projectRoot,
          kind: 'review',
          group: group.id,
          round,
        });
        expect(validated.summary.ok).toBe(true);
      }
      const legacy = readPreparedReviewState(prepared);
      legacy.effort = effort;
      legacy.groups[0]!.rounds = effort === 'medium' ? 2 : 1;
      legacy.groups[0]!.validated.review!.complete = true;
      writeFileAtomicallySync(
        prepared.data.statePath,
        JSON.stringify(
          await refreshReviewFixtureInputs(
            legacy,
            resolveReviewStatePaths(fixture.projectRoot, fixture.branchName),
            fixture.pluginRoot,
          ),
        ),
      );
      const opinionPath = portableJoin(
        prepared.data.reviewDirectory,
        group.opinionPath,
      );
      const merged = readFileSync(opinionPath, 'utf8');
      expect(JSON.parse(merged).findings).toHaveLength(2);

      for (const attempt of [1, 2]) {
        rmSync(opinionPath);
        const restored = await handleReviewState({
          action: 'prepare',
          projectRoot: fixture.projectRoot,
          effort,
        });
        expect(readFileSync(opinionPath, 'utf8'), `recovery ${attempt}`).toBe(
          merged,
        );
        expect(restored.data.groups[0]!.validated.review).toEqual(
          legacy.groups[0]!.validated.review,
        );
        expect(restored.data.next).toMatchObject([
          { kind: 'verify', group: group.id },
        ]);
      }
    },
  );

  it.each([
    {
      effort: 'medium' as const,
      severity: 'warning',
      missing: false,
      nextKind: 'verify',
    },
    {
      effort: 'medium' as const,
      severity: 'error',
      missing: false,
      nextKind: 'review',
    },
    {
      effort: 'medium' as const,
      severity: 'error',
      missing: true,
      nextKind: 'review',
    },
    {
      effort: 'high' as const,
      severity: 'warning',
      missing: false,
      nextKind: 'review',
    },
    {
      effort: 'low' as const,
      severity: 'error',
      missing: false,
      nextKind: 'verify',
    },
  ])(
    '$effort $severity missing=$missing yields $nextKind',
    async ({ effort, severity, missing, nextKind }) => {
      const state = await prepareReviewStateSealFixture(fixture, effort);
      const paths = resolveReviewStatePaths(
        state.projectRoot,
        state.branchName,
      );
      const group = state.groups[0]!;
      const finding = {
        ...buildReviewStateSealFinding(group.id),
        severity,
        ...(missing ? { existingCode: 'absent from committed source' } : {}),
      };
      writeFileAtomicallySync(
        portableJoin(paths.reviewDirectory, group.skeletonPath),
        JSON.stringify({
          ...buildReviewOpinion(state, group),
          findings: [finding],
        }),
      );
      const result = await handleReviewState({
        action: 'validate',
        projectRoot: fixture.projectRoot,
        kind: 'review',
        group: group.id,
        round: 1,
      });
      expect(result.summary).toMatchObject({
        ok: true,
        nextRound: nextKind === 'review' ? 2 : null,
      });
      expect(result.data.next?.map((handoff) => handoff.kind)).toEqual(
        nextKind ? [nextKind] : [],
      );
      expect(result.data).toMatchObject({
        verifierRequired: nextKind === 'verify',
      });
    },
  );
});
