import { rmSync } from 'node:fs';

import { readUtf8FileIfExistsSync } from '@ogham/cross-platform';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleReviewState } from '../../../../mcp/tools/reviewState/index.js';

import { buildReviewOpinion } from './helpers/buildReviewOpinion.js';
import { buildReviewStateSealFinding } from './helpers/buildReviewStateSealFinding.js';
import {
  type ReviewStateSealFixture,
  createReviewStateSealFixture,
} from './helpers/createReviewStateSealFixture.js';
import { prepareReviewStateSealFixture } from './helpers/prepareReviewStateSealFixture.js';
import { runReviewStateFixtureGit } from './helpers/runReviewStateFixtureGit.js';
import { validateReviewStateSealGroup } from './helpers/validateReviewStateSealGroup.js';
import { writeReviewStateFixtureFile } from './helpers/writeReviewStateFixtureFile.js';

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

describe('prepared diagnostic evidence through seal and cache', () => {
  it.each([false, true])(
    'retains import recovery through seal and cache (confirmed=%s)',
    async (confirmed) => {
      writeReviewStateFixtureFile(
        fixture.projectRoot,
        'src/value.ts',
        'import { missing } from "./moved.js";\nexport const value = missing;\n',
      );
      runReviewStateFixtureGit(fixture.projectRoot, ['add', 'src/value.ts']);
      runReviewStateFixtureGit(fixture.projectRoot, [
        'commit',
        '-m',
        'unresolved import fixture',
      ]);
      const state = await prepareReviewStateSealFixture(fixture);
      const diagnostic = state.scope.diagnostics?.find(
        ({ code }) => code === 'unresolved-local-dependency',
      );
      expect(diagnostic).toMatchObject({
        path: 'src/value.ts',
        specifier: './moved.js',
        affects: ['dependencies', 'boundaries'],
      });
      expect(diagnostic?.causeId).toMatch(/^[a-f0-9]{64}$/);
      expect(state.scope.statuses.analysisAxes?.dependencies).toBe(
        'indeterminate',
      );
      const group = state.groups[0]!;
      const opinion = buildReviewOpinion(state, group);
      if (confirmed)
        opinion.findings = [
          {
            ...buildReviewStateSealFinding(group.id),
            existingCode: 'export const value = missing;',
          },
        ];
      opinion.gaps = [
        {
          path: 'src/value.ts',
          rule: 'FCA-13',
          detail: 'Import target unavailable',
          causeId: diagnostic!.causeId,
        },
      ];
      await validateReviewStateSealGroup({
        fixture,
        state,
        opinion,
        decisions: confirmed
          ? [
              {
                findingId: `R${group.id}-001`,
                verdict: 'CONFIRMED',
                evidence: 'src/value.ts:2',
                reason: 'The exported value requires the unresolved target.',
              },
            ]
          : [],
      });
      const sealed = await handleReviewState({
        action: 'seal',
        projectRoot: fixture.projectRoot,
        branchName: fixture.branchName,
      });
      expect(sealed.summary).toMatchObject({
        disposition: 'sealed',
        verdict: confirmed ? 'REQUEST_CHANGES' : 'INCONCLUSIVE',
        reviewComplete: false,
      });
      if (!('blockersPath' in sealed.data))
        throw new Error('Expected sealed artifacts');
      const blockers = readUtf8FileIfExistsSync(sealed.data.blockersPath!);
      expect(blockers).toContain(diagnostic!.causeId);
      expect(blockers).toContain('Restore the intended import target');
      expect(blockers).toContain('**Proposed owner** — agent');
      const report = readUtf8FileIfExistsSync(sealed.data.reportPath);
      expect(report).toContain('| dependencies_certainty | indeterminate |');
      const cached = await handleReviewState({
        action: 'seal',
        projectRoot: fixture.projectRoot,
        branchName: fixture.branchName,
      });
      if (!('blockersPath' in cached.data))
        throw new Error('Expected cached sealed artifacts');
      expect(cached.summary).toEqual(sealed.summary);
      expect(cached.data.blockersPath).toBe(sealed.data.blockersPath);
    },
  );
});
