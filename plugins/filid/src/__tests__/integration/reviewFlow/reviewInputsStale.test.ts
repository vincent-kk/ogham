import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { assertReviewInputsFresh } from '../../../mcp/tools/reviewState/handlers/utils/assertReviewInputsFresh.js';
import { handleReviewState } from '../../../mcp/tools/reviewState/index.js';
import { readReviewState } from '../../../mcp/tools/reviewState/state/readReviewState.js';
import { resolveReviewStatePaths } from '../../../mcp/tools/reviewState/state/resolveReviewStatePaths.js';
import type { ReviewStateRecord } from '../../../mcp/tools/reviewState/state/reviewStateTypes.js';
import { commitReviewStateFixture } from '../../unit/mcp/reviewState/helpers/commitReviewStateFixture.js';
import { completeIncrementalReview } from '../../unit/mcp/reviewState/helpers/completeIncrementalReview.js';
import { configureReviewGroups } from '../../unit/mcp/reviewState/helpers/configureReviewGroups.js';
import {
  type ReviewStateSealFixture,
  createReviewStateSealFixture,
} from '../../unit/mcp/reviewState/helpers/createReviewStateSealFixture.js';

import { disposeReviewStateSealFixture } from './helpers/disposeReviewStateSealFixture.js';
import { editPersistedReviewState } from './helpers/editPersistedReviewState.js';

/** Freshness-gated actions exercised against every input drift. */
type GatedAction = 'validate' | 'seal' | 'checkpoint';

/** One post-prepare drift of a judgment input and how the fixture applies it. */
interface InputDrift {
  /** Stable case label naming the drifted input. */
  name: string;
  /** Mutation applied after prepare and a complete review. */
  apply: (fixture: ReviewStateSealFixture) => void;
}

/** User requirement recorded in the prepare recipe. */
const USER_INSTRUCTIONS = 'Check that the exported value stays numeric.';

/** Summary each gated action returns when every input is unchanged. */
const UNCHANGED_SUMMARIES: Record<GatedAction, Record<string, unknown>> = {
  validate: { disposition: 'validated', ok: true },
  seal: { disposition: 'sealed', verdict: 'APPROVED' },
  checkpoint: { disposition: 'resumable', phase: 'prepared' },
};

/** Seal fixture prepared and reviewed before each drift. */
let fixture: ReviewStateSealFixture;
/** Prepared state before any drift, used by the direct gate check. */
let prepared: ReviewStateRecord;

/**
 * Call one freshness-gated action against the prepared fixture.
 * @param action Gated review_state action.
 * @returns The action's resolved payload; a stale input rejects instead.
 */
async function runGatedAction(action: GatedAction) {
  const { projectRoot, branchName } = fixture;
  if (action !== 'validate')
    return handleReviewState({ action, projectRoot, branchName });
  return handleReviewState({
    action,
    projectRoot,
    branchName,
    kind: 'review',
    group: prepared.groups[0].id,
    round: 1,
  });
}

/**
 * Build a PR body whose handoff block records one repository-wide claim.
 * @returns Change context carrying a parsed handoff claim for every file.
 */
async function buildHandoffChangeContext(): Promise<string> {
  const handoff = await handleReviewState({
    action: 'handoff',
    projectRoot: fixture.projectRoot,
    branchName: fixture.branchName,
    baseRef: 'main',
    documentSync: 'committed',
    repaired: 0,
    entries: [
      {
        class: 'config-decision',
        ruleId: 'lockfile-policy',
        path: '.',
        severity: 'warning',
        certainty: 'unstated',
        note: 'Lockfile churn is intentional.',
      },
    ],
  });
  return `## Summary\n\nBump the value.\n\n${readFileSync(handoff.data.handoffPath, 'utf8')}`;
}

beforeEach(async () => {
  fixture = createReviewStateSealFixture();
  configureReviewGroups(fixture.projectRoot, 1);
  const changeContext = await buildHandoffChangeContext();
  const payload = await handleReviewState({
    action: 'prepare',
    projectRoot: fixture.projectRoot,
    branchName: fixture.branchName,
    baseRef: 'main',
    effort: 'low',
    userInstructions: USER_INSTRUCTIONS,
    changeContext,
  });
  const restored = readReviewState(payload.data.statePath);
  if (!restored || 'kind' in restored)
    throw new Error('prepare wrote no state');
  prepared = restored;
  await completeIncrementalReview(fixture.projectRoot);
});
afterEach(() => disposeReviewStateSealFixture(fixture));

describe('review-inputs-stale gate after prepare', () => {
  it('records the handoff claim and instructions it later guards', () => {
    expect(prepared.incremental?.userInstructions).toBe(USER_INSTRUCTIONS);
    expect(prepared.incremental?.changeContext).toContain('lockfile-policy');
  });

  it.each(['validate', 'seal', 'checkpoint'] as const)(
    '%s passes the gate when no input changed',
    async (action) => {
      const result = await runGatedAction(action);
      expect(result).toMatchObject({ status: 'ok', diagnostics: [] });
      expect(result.summary).toMatchObject(UNCHANGED_SUMMARIES[action]);
    },
  );

  describe.each<InputDrift>([
    {
      name: 'rule file',
      apply: ({ pluginRoot }) =>
        appendFileSync(
          join(pluginRoot, 'skills/cross-review/rules/default.md'),
          '\nAlso check naming.\n',
        ),
    },
    {
      name: 'actor method',
      apply: ({ pluginRoot }) =>
        appendFileSync(
          join(pluginRoot, 'skills/cross-review/reviewers/reviewer.md'),
          '\nRead every caller.\n',
        ),
    },
    {
      name: 'generatedPaths config',
      apply: ({ projectRoot }) => {
        const path = join(projectRoot, '.filid/config.json');
        const config = JSON.parse(readFileSync(path, 'utf8'));
        writeFileSync(
          path,
          JSON.stringify({
            ...config,
            structure: { generatedPaths: ['dist'] },
          }),
        );
      },
    },
    {
      name: 'recipe userInstructions',
      apply: ({ projectRoot, branchName }) =>
        editPersistedReviewState(projectRoot, branchName, (state) => {
          state.incremental!.userInstructions = 'Check performance only.';
        }),
    },
    {
      name: 'recipe changeContext',
      apply: ({ projectRoot, branchName }) =>
        editPersistedReviewState(projectRoot, branchName, (state) => {
          state.incremental!.changeContext = null;
        }),
    },
  ])('after a $name drift', ({ apply }) => {
    it.each(['validate', 'seal', 'checkpoint'] as const)(
      '%s rejects with review-inputs-stale',
      async (action) => {
        apply(fixture);
        await expect(runGatedAction(action)).rejects.toMatchObject({
          code: 'review-inputs-stale',
        });
      },
    );
  });

  it.each(['validate', 'seal', 'checkpoint'] as const)(
    'current behavior: %s reports source-hash-stale, not review-inputs-stale, after a HEAD tree change',
    async (action) => {
      writeFileSync(
        join(fixture.projectRoot, 'src/value.ts'),
        'export const value = 3;\n',
      );
      commitReviewStateFixture(fixture.projectRoot, 'Change after review');
      const result = await runGatedAction(action);
      expect(result.diagnostics.map(({ code }) => code)).toEqual([
        'review-source-hash-stale',
      ]);
    },
  );

  it('rejects a HEAD tree change at the gate itself', async () => {
    writeFileSync(
      join(fixture.projectRoot, 'src/value.ts'),
      'export const value = 3;\n',
    );
    commitReviewStateFixture(fixture.projectRoot, 'Change after review');
    await expect(
      assertReviewInputsFresh(
        prepared,
        resolveReviewStatePaths(fixture.projectRoot, fixture.branchName),
        'validate',
      ),
    ).rejects.toMatchObject({ code: 'review-inputs-stale' });
  });
});
