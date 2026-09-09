import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleReviewState } from '../../../../mcp/tools/reviewState/index.js';

import { buildReviewOpinion } from './helpers/buildReviewOpinion.js';
import { buildReviewStateSealFinding } from './helpers/buildReviewStateSealFinding.js';
import { buildVerifyOpinion } from './helpers/buildVerifyOpinion.js';
import { configureReviewGroups } from './helpers/configureReviewGroups.js';
import {
  type ReviewStateSealFixture,
  createReviewStateSealFixture,
} from './helpers/createReviewStateSealFixture.js';
import { readPreparedReviewState } from './helpers/readPreparedReviewState.js';

/** Real prepare/validate/seal fixture; only actor opinions are supplied by the test. */
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

describe('automatic low precision protections', () => {
  it.each(['clean', 'finding', 'gap', 'missing'] as const)(
    'retains every group and seals %s evidence correctly',
    async (scenario) => {
      configureReviewGroups(fixture.projectRoot, 16, {
        highRiskPaths: ['src/value.ts'],
      });
      const prepared = await handleReviewState({
        action: 'prepare',
        projectRoot: fixture.projectRoot,
      });
      const state = readPreparedReviewState(prepared);
      expect(state.effort).toBe('low');
      expect(prepared.data.next).toHaveLength(16);
      const risk = state.groups.find((group) =>
        group.units.some((unit) => unit.path === 'src/value.ts'),
      )!;
      expect(
        prepared.data.next.find((handoff) => handoff.group === risk.id),
      ).toMatchObject({ modelTier: 'strong', round: 1 });
      expect(
        prepared.data.next
          .filter((handoff) => handoff.group !== risk.id)
          .every((handoff) => handoff.modelTier === 'efficient'),
      ).toBe(true);
      for (const group of state.groups) {
        if (scenario === 'missing' && group === risk) continue;
        const opinion = buildReviewOpinion(state, group);
        if (group === risk && scenario === 'finding')
          opinion.findings = [buildReviewStateSealFinding(group.id)];
        if (group === risk && scenario === 'gap') {
          opinion.state = 'INDETERMINATE';
          opinion.gaps = [
            {
              path: 'src/value.ts',
              rule: 'DEF-1',
              detail: 'Consumer evidence is unavailable.',
              resolution: {
                question: 'What do consumers require?',
                evidenceNeeded: ['Consumer contract'],
                nextAction: 'Inspect the consumer contract.',
                doneWhen: 'Consumer expectations are verified.',
                suggestedOwner: 'agent',
              },
            },
          ];
        }
        writeFileSync(
          join(prepared.data.reviewDirectory, group.skeletonPath),
          JSON.stringify(opinion),
        );
        const validated = await handleReviewState({
          action: 'validate',
          projectRoot: fixture.projectRoot,
          kind: 'review',
          group: group.id,
          round: 1,
        });
        expect(validated.summary).toMatchObject({ ok: true, nextRound: null });
        if (group === risk && scenario === 'finding') {
          expect(validated.data.next).toContainEqual(
            expect.objectContaining({
              kind: 'verify',
              group: group.id,
              modelTier: 'efficient',
            }),
          );
          const verify = buildVerifyOpinion(state, group.id, [
            {
              findingId: `R${group.id}-001`,
              verdict: 'CONFIRMED',
              evidence: 'src/value.ts:1',
              reason: 'The changed export contradicts the fixture contract.',
            },
          ]);
          writeFileSync(
            join(prepared.data.reviewDirectory, group.verifyPath),
            JSON.stringify(verify),
          );
          const checked = await handleReviewState({
            action: 'validate',
            projectRoot: fixture.projectRoot,
            kind: 'verify',
            group: group.id,
          });
          expect(checked.summary).toMatchObject({ ok: true });
        }
      }
      const sealed = await handleReviewState({
        action: 'seal',
        projectRoot: fixture.projectRoot,
      });
      expect(sealed.summary.verdict).toBe(
        scenario === 'clean'
          ? 'APPROVED'
          : scenario === 'finding'
            ? 'REQUEST_CHANGES'
            : 'INCONCLUSIVE',
      );
      expect(sealed.data.reportPath).toBeTypeOf('string');
      const report = readFileSync(sealed.data.reportPath!, 'utf8');
      for (const group of state.groups)
        for (const unit of group.units) expect(report).toContain(unit.path);
    },
  );
});
