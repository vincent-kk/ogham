import { readFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  handleReviewState,
  observeReviewGroupInputs,
} from '../../../mcp/tools/reviewState/index.js';
import { readReviewState } from '../../../mcp/tools/reviewState/state/readReviewState.js';
import { resolveReviewStatePaths } from '../../../mcp/tools/reviewState/state/resolveReviewStatePaths.js';
import type { ReviewStateRecord } from '../../../mcp/tools/reviewState/state/reviewStateTypes.js';
import { buildReviewOpinion } from '../../unit/mcp/reviewState/helpers/buildReviewOpinion.js';
import { completeIncrementalReview } from '../../unit/mcp/reviewState/helpers/completeIncrementalReview.js';
import { writeReviewStateFixtureJson } from '../../unit/mcp/reviewState/helpers/writeReviewStateFixtureJson.js';

import { PINNED_REVIEW_BRANCH } from './helpers/createPinnedReviewRepository.js';
import { editPersistedReviewState } from './helpers/editPersistedReviewState.js';
import { restoreHostPluginRoot } from './helpers/restoreHostPluginRoot.js';
import { restorePreservedReviewState } from './helpers/restorePreservedReviewState.js';
import { runPinnedReviewGit } from './helpers/runPinnedReviewGit.js';
import type { PreservedTreeRoots } from './helpers/utils/copyPreservedTreeWithRoots.js';

/** State prepared by the S0 code and preserved unchanged; see its README before touching it. */
const PRESERVED_S0 = fileURLToPath(
  new URL('./fixtures/preserved-s0/', import.meta.url),
);

/** Restored roots for the current case. */
let restored: PreservedTreeRoots;
/** Preserved state read back through the current schema. */
let preserved: ReviewStateRecord;
/** Host plugin root restored after each case. */
const originalPluginRoot = process.env.CLAUDE_PLUGIN_ROOT;

beforeEach(async () => {
  restored = await restorePreservedReviewState(PRESERVED_S0);
  process.env.CLAUDE_PLUGIN_ROOT = restored.pluginRoot;
  const state = readReviewState(
    resolveReviewStatePaths(restored.projectRoot, PINNED_REVIEW_BRANCH)
      .statePath,
  );
  if (!state || 'kind' in state)
    throw new Error('preserved state is not a readable v2 state');
  preserved = state;
});
afterEach(() => {
  rmSync(restored.projectRoot, { recursive: true, force: true });
  rmSync(restored.pluginRoot, { recursive: true, force: true });
  restoreHostPluginRoot(originalPluginRoot);
});

/**
 * The artifact paths a seal response carries.
 * @param sealed Result of the seal action.
 * @returns The report path and the blockers path, null when nothing blocks.
 */
function sealedPaths(sealed: Awaited<ReturnType<typeof handleReviewState>>): {
  reportPath: string;
  blockersPath: string | null;
} {
  if (!sealed.data || !('blockersPath' in sealed.data))
    throw new Error('seal returned no artifact paths');
  return sealed.data;
}

describe('state prepared by S0 code replays on the current code', () => {
  it('rebuilds the exact commits the preserved state was prepared against', () => {
    expect(
      runPinnedReviewGit(restored.projectRoot, ['rev-parse', 'HEAD']),
    ).toBe(preserved.incremental?.headCommit);
    expect(
      runPinnedReviewGit(restored.projectRoot, ['rev-parse', 'main']),
    ).toBe(preserved.baseCommit);
    expect(preserved.scope.candidates).toHaveLength(2);
    expect(preserved.groups).toHaveLength(2);
  });

  it('checkpoints the preserved generation without stale or invalid state', async () => {
    const checkpoint = await handleReviewState({
      action: 'checkpoint',
      projectRoot: restored.projectRoot,
      branchName: PINNED_REVIEW_BRANCH,
    });
    expect(checkpoint).toMatchObject({ status: 'ok', diagnostics: [] });
    expect(checkpoint.summary).toMatchObject({
      disposition: 'resumable',
      generationId: preserved.generationId,
    });
  });

  it('validates a reviewer round from a brief that carries no generationId', async () => {
    const [group] = preserved.groups;
    writeReviewStateFixtureJson(
      restored.projectRoot,
      preserved,
      group.skeletonPath,
      buildReviewOpinion(preserved, group),
    );
    const validated = await handleReviewState({
      action: 'validate',
      projectRoot: restored.projectRoot,
      branchName: PINNED_REVIEW_BRANCH,
      kind: 'review',
      group: group.id,
      round: 1,
    });
    expect(validated.status).toBe('ok');
    expect(validated.summary).toMatchObject({ ok: true, problemCount: 0 });
  });

  it('completes every handoff and seals the preserved generation', async () => {
    await completeIncrementalReview(restored.projectRoot);
    const sealed = await handleReviewState({
      action: 'seal',
      projectRoot: restored.projectRoot,
      branchName: PINNED_REVIEW_BRANCH,
    });
    expect(sealed).toMatchObject({ status: 'ok', diagnostics: [] });
    expect(sealed.summary).toMatchObject({
      disposition: 'sealed',
      verdict: 'REQUEST_CHANGES',
      confirmed: 2,
      reviewComplete: true,
    });
  });

  it('seals a stored diagnostic without affects as a blocker, the way it was written', async () => {
    editPersistedReviewState(
      restored.projectRoot,
      PINNED_REVIEW_BRANCH,
      (state) => {
        state.scope.diagnostics = [
          {
            code: 'unresolved-local-dependency',
            message: 'Cannot resolve ./moved.js from src/alpha/value.ts',
            path: 'src/alpha/value.ts',
          },
        ];
      },
    );
    await completeIncrementalReview(restored.projectRoot);
    const sealed = await handleReviewState({
      action: 'seal',
      projectRoot: restored.projectRoot,
      branchName: PINNED_REVIEW_BRANCH,
    });
    const { blockersPath } = sealedPaths(sealed);
    expect(blockersPath).toEqual(expect.any(String));
    expect(readFileSync(String(blockersPath), 'utf8')).toContain(
      'unresolved-local-dependency',
    );
  });

  it('seals a stored diagnostic with affects [] as verdict-neutral evidence, not a blocker', async () => {
    editPersistedReviewState(
      restored.projectRoot,
      PINNED_REVIEW_BRANCH,
      (state) => {
        state.scope.diagnostics = [
          {
            code: 'config-warning',
            message:
              'rules["zero-peer-file"].exempt: invalid glob syntax "[bad" (dropped)',
            affects: [],
          },
        ];
      },
    );
    await completeIncrementalReview(restored.projectRoot);
    const sealed = await handleReviewState({
      action: 'seal',
      projectRoot: restored.projectRoot,
      branchName: PINNED_REVIEW_BRANCH,
    });
    const { blockersPath, reportPath } = sealedPaths(sealed);
    expect(blockersPath).toBeNull();
    const report = readFileSync(reportPath, 'utf8');
    const unresolved = report.slice(report.indexOf('## Unresolved Evidence'));
    expect(unresolved).toContain('config-warning');
  });

  it('validates and seals a stored graph-uncertainty candidate the earlier code wrote, without stale inputs', async () => {
    const { statePath } = resolveReviewStatePaths(
      restored.projectRoot,
      PINNED_REVIEW_BRANCH,
    );
    let recorded: ReviewStateRecord | undefined;
    editPersistedReviewState(
      restored.projectRoot,
      PINNED_REVIEW_BRANCH,
      (state) => {
        state.scope.candidates.push({
          id: 'FCA-003',
          source: 'structure',
          scope: 'dag',
          category: 'structure',
          severity: 'warning',
          path: 'src/alpha',
          rule: 'circular-dependency',
          message:
            'Dependency graph certainty is indeterminate; cycles through unconfirmed references may be missing.',
          certainty: 'indeterminate',
        });
        recorded = state;
      },
    );
    if (!recorded?.incremental) throw new Error('state has no recipe');
    const recipe = recorded.incremental;
    const groups = await observeReviewGroupInputs(
      recorded,
      resolveReviewStatePaths(restored.projectRoot, PINNED_REVIEW_BRANCH),
      recipe.userInstructions,
      recipe.changeContext ?? undefined,
      recipe.pluginRoot,
    );
    editPersistedReviewState(
      restored.projectRoot,
      PINNED_REVIEW_BRANCH,
      (state) => {
        state.groups = groups;
      },
    );
    expect(readFileSync(statePath, 'utf8')).toContain('FCA-003');
    await completeIncrementalReview(restored.projectRoot);
    const sealed = await handleReviewState({
      action: 'seal',
      projectRoot: restored.projectRoot,
      branchName: PINNED_REVIEW_BRANCH,
    });
    expect(sealed).toMatchObject({ status: 'ok', diagnostics: [] });
    expect(sealed.summary).toMatchObject({ disposition: 'sealed' });
  });
});
