import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleReviewState } from '../../../mcp/tools/reviewState/index.js';
import { foldReviewVerdict } from '../../../mcp/tools/reviewState/verdict/foldReviewVerdict.js';
import { completeIncrementalReview } from '../../unit/mcp/reviewState/helpers/completeIncrementalReview.js';
import { configureReviewGroups } from '../../unit/mcp/reviewState/helpers/configureReviewGroups.js';
import { createReviewRulePluginRoot } from '../../unit/mcp/reviewState/helpers/createReviewRulePluginRoot.js';
import type { ReviewStateSealFixture } from '../../unit/mcp/reviewState/helpers/createReviewStateSealFixture.js';
import { createVerdictFoldFixture } from '../../unit/mcp/reviewState/helpers/createVerdictFoldFixture.js';
import { readPreparedReviewState } from '../../unit/mcp/reviewState/helpers/readPreparedReviewState.js';

import {
  PINNED_REVIEW_BRANCH,
  createPinnedReviewRepository,
} from './helpers/createPinnedReviewRepository.js';
import { disposeReviewStateSealFixture } from './helpers/disposeReviewStateSealFixture.js';
import { PLAIN_REVIEW_REPOSITORY } from './helpers/reviewFlowRepositoryFiles.js';

describe('evidence axes → verdict table', () => {
  // Dirty source or documents always win; a confirmed candidate wins over incomplete evidence.
  it.each([
    [true, 'clean', false, 'APPROVED'],
    [true, 'clean', true, 'REQUEST_CHANGES'],
    [true, 'generated-only', false, 'APPROVED'],
    [true, 'generated-only', true, 'REQUEST_CHANGES'],
    [true, 'documents-only', false, 'INCONCLUSIVE'],
    [true, 'documents-only', true, 'INCONCLUSIVE'],
    [true, 'source-dirty', false, 'INCONCLUSIVE'],
    [true, 'source-dirty', true, 'INCONCLUSIVE'],
    [false, 'clean', false, 'INCONCLUSIVE'],
    [false, 'clean', true, 'REQUEST_CHANGES'],
    [false, 'generated-only', false, 'INCONCLUSIVE'],
    [false, 'generated-only', true, 'REQUEST_CHANGES'],
    [false, 'documents-only', false, 'INCONCLUSIVE'],
    [false, 'documents-only', true, 'INCONCLUSIVE'],
    [false, 'source-dirty', false, 'INCONCLUSIVE'],
    [false, 'source-dirty', true, 'INCONCLUSIVE'],
  ] as const)(
    'complete=%s worktree=%s confirmed=%s → %s',
    (evidenceComplete, worktree, confirmed, verdict) => {
      const input = createVerdictFoldFixture();
      input.evidence = { ...input.evidence, evidenceComplete, worktree };
      if (!confirmed) {
        input.candidates = [];
        input.groups[0].group.candidateIds = [];
        const [{ review, verify }] = input.groups;
        if (!review || !verify)
          throw new Error('fold fixture lost its opinions');
        review.checked = ['src/a.ts'];
        verify.checked = ['src/a.ts'];
      }
      const result = foldReviewVerdict(input);
      expect(result.verdict).toBe(verdict);
      expect(result.reviewComplete).toBe(
        evidenceComplete &&
          (worktree === 'clean' || worktree === 'generated-only'),
      );
    },
  );
});

describe('config-warning end to end', () => {
  /** Pinned repository whose ignored config may carry an unknown key. */
  let fixture: ReviewStateSealFixture;

  beforeEach(() => {
    const originalPluginRoot = process.env.CLAUDE_PLUGIN_ROOT;
    const pluginRoot = createReviewRulePluginRoot();
    process.env.CLAUDE_PLUGIN_ROOT = pluginRoot;
    fixture = {
      projectRoot: createPinnedReviewRepository(PLAIN_REVIEW_REPOSITORY),
      pluginRoot,
      branchName: PINNED_REVIEW_BRANCH,
      originalPluginRoot,
    };
    configureReviewGroups(fixture.projectRoot, 1);
  });
  afterEach(() => disposeReviewStateSealFixture(fixture));

  it.each([
    { unknownKey: false, verdict: 'APPROVED', complete: true },
    { unknownKey: true, verdict: 'INCONCLUSIVE', complete: false },
  ])(
    'current behavior: unknown config key=$unknownKey seals $verdict for a clean, finding-free review',
    async ({ unknownKey, verdict, complete }) => {
      if (unknownKey)
        writeFileSync(
          join(fixture.projectRoot, '.filid/config.json'),
          JSON.stringify({
            version: '2.0',
            adapters: { mode: 'auto', enabled: [] },
            rules: {},
            review: { groupFileLimit: 1 },
            unknownSetting: true,
          }),
        );
      const prepared = await handleReviewState({
        action: 'prepare',
        projectRoot: fixture.projectRoot,
        branchName: fixture.branchName,
        baseRef: 'main',
        effort: 'low',
      });
      const state = readPreparedReviewState(prepared);
      expect(
        prepared.diagnostics.some(({ code }) => code === 'config-warning'),
      ).toBe(unknownKey);
      expect(state.scope.evidenceComplete).toBe(complete);
      expect(state.scope.statuses.structure).toBe(
        complete ? 'ok' : 'indeterminate',
      );
      await completeIncrementalReview(fixture.projectRoot);
      const sealed = await handleReviewState({
        action: 'seal',
        projectRoot: fixture.projectRoot,
        branchName: fixture.branchName,
      });
      expect(sealed.summary).toMatchObject({
        verdict,
        reviewComplete: complete,
        confirmed: 0,
      });
    },
  );
});
