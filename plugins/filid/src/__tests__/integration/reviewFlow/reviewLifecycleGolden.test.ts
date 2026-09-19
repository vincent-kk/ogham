import { readFileSync } from 'node:fs';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { ReviewStateRecord } from '../../../mcp/tools/reviewState/state/reviewStateTypes.js';
import { buildReviewOpinion } from '../../unit/mcp/reviewState/helpers/buildReviewOpinion.js';
import { buildReviewStateSealFinding } from '../../unit/mcp/reviewState/helpers/buildReviewStateSealFinding.js';
import { configureReviewGroups } from '../../unit/mcp/reviewState/helpers/configureReviewGroups.js';
import { createReviewRulePluginRoot } from '../../unit/mcp/reviewState/helpers/createReviewRulePluginRoot.js';
import type { ReviewStateSealFixture } from '../../unit/mcp/reviewState/helpers/createReviewStateSealFixture.js';
import { prepareReviewStateSealFixture } from '../../unit/mcp/reviewState/helpers/prepareReviewStateSealFixture.js';
import { readPersistedReviewState } from '../../unit/mcp/reviewState/helpers/readPersistedReviewState.js';
import {
  type ExpectedReviewStateSeal,
  sealReviewStateFixtureAndAssert,
} from '../../unit/mcp/reviewState/helpers/sealReviewStateFixtureAndAssert.js';
import {
  type ReviewStateSealDecision,
  validateReviewStateSealGroup,
} from '../../unit/mcp/reviewState/helpers/validateReviewStateSealGroup.js';

import {
  PINNED_REVIEW_BRANCH,
  createPinnedReviewRepository,
} from './helpers/createPinnedReviewRepository.js';
import { disposeReviewStateSealFixture } from './helpers/disposeReviewStateSealFixture.js';
import { normalizeReviewStateText } from './helpers/normalizeReviewStateText.js';
import { PLAIN_REVIEW_REPOSITORY } from './helpers/reviewFlowRepositoryFiles.js';

/** One end-to-end verdict path: reviewer findings, verifier decisions and the expected fold. */
interface LifecycleCase {
  /** Terminal verdict the case must seal. */
  verdict: ExpectedReviewStateSeal['verdict'];
  /** Verifier decision for the single reviewer finding, or null for no finding. */
  decision: ReviewStateSealDecision['verdict'] | null;
  /** Fold counts asserted by the shared seal helper. */
  expected: ExpectedReviewStateSeal;
}

/** Pinned repository prepared, reviewed and sealed by each case. */
let fixture: ReviewStateSealFixture;

/**
 * Normalize a sealed artifact's text: absolute roots, generation id and timestamps only.
 * @param text Artifact text.
 * @param state Sealed state supplying the project root, generation id and times.
 * @param pluginRoot Plugin root the state was prepared with.
 * @returns Text comparable across machines and runs.
 */
function normalizeArtifact(
  text: string,
  state: ReviewStateRecord,
  pluginRoot: string,
): string {
  return text
    .replaceAll(state.projectRoot, '<ROOT0>')
    .replaceAll(pluginRoot, '<ROOT1>')
    .replaceAll(state.sealedAt || '<SEALED_AT>', '<SEALED_AT>')
    .replaceAll(state.preparedAt || '<CREATED_AT>', '<CREATED_AT>')
    .replaceAll(state.generationId || '<GENERATION>', '<GENERATION>');
}

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

describe('review lifecycle golden: prepare → validate → seal', () => {
  it.each<LifecycleCase>([
    {
      verdict: 'APPROVED',
      decision: null,
      expected: {
        verdict: 'APPROVED',
        filesReviewed: 1,
        filesSkipped: 1,
        confirmed: 0,
        refuted: 0,
        indeterminate: 0,
        hasFixRequests: false,
      },
    },
    {
      verdict: 'REQUEST_CHANGES',
      decision: 'CONFIRMED',
      expected: {
        verdict: 'REQUEST_CHANGES',
        filesReviewed: 1,
        filesSkipped: 1,
        confirmed: 1,
        refuted: 0,
        indeterminate: 0,
        hasFixRequests: true,
      },
    },
    {
      verdict: 'INCONCLUSIVE',
      decision: 'INDETERMINATE',
      expected: {
        verdict: 'INCONCLUSIVE',
        filesReviewed: 1,
        filesSkipped: 1,
        confirmed: 0,
        refuted: 0,
        indeterminate: 1,
        hasFixRequests: false,
      },
    },
  ])(
    'seals $verdict with golden state, report and PR comment',
    async ({ verdict, decision, expected }) => {
      const prepared = await prepareReviewStateSealFixture(fixture);
      const group = prepared.groups[0];
      const opinion = buildReviewOpinion(prepared, group);
      if (decision) opinion.findings = [buildReviewStateSealFinding(group.id)];
      await validateReviewStateSealGroup({
        fixture,
        state: prepared,
        opinion,
        decisions: decision
          ? [
              {
                findingId: `R${group.id}-001`,
                verdict: decision,
                evidence: 'src/value.ts:1',
                reason: 'The changed export decides the claim.',
              },
            ]
          : [],
      });
      const validated = readPersistedReviewState(
        fixture.projectRoot,
        prepared.normalizedBranch,
      );
      const sealed = await sealReviewStateFixtureAndAssert(
        fixture,
        validated,
        expected,
      );
      const state = readPersistedReviewState(
        fixture.projectRoot,
        prepared.normalizedBranch,
      );
      await expect(
        normalizeReviewStateText(state, [
          state.projectRoot,
          fixture.pluginRoot,
        ]),
      ).toMatchFileSnapshot(`./fixtures/golden/${verdict}.state.json`);
      for (const [name, path] of [
        ['report.md', sealed.data.reportPath],
        ['pr-comment.md', sealed.data.prCommentPath],
      ] as const)
        await expect(
          normalizeArtifact(
            readFileSync(path ?? '', 'utf8'),
            state,
            fixture.pluginRoot,
          ),
        ).toMatchFileSnapshot(`./fixtures/golden/${verdict}.${name}`);
    },
  );
});
