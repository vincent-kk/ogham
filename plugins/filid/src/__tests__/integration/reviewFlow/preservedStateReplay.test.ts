import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleReviewState } from '../../../mcp/tools/reviewState/index.js';
import { readReviewState } from '../../../mcp/tools/reviewState/state/readReviewState.js';
import { resolveReviewStatePaths } from '../../../mcp/tools/reviewState/state/resolveReviewStatePaths.js';
import type { ReviewStateRecord } from '../../../mcp/tools/reviewState/state/reviewStateTypes.js';
import { buildReviewOpinion } from '../../unit/mcp/reviewState/helpers/buildReviewOpinion.js';
import { completeIncrementalReview } from '../../unit/mcp/reviewState/helpers/completeIncrementalReview.js';
import { writeReviewStateFixtureJson } from '../../unit/mcp/reviewState/helpers/writeReviewStateFixtureJson.js';

import { PINNED_REVIEW_BRANCH } from './helpers/createPinnedReviewRepository.js';
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

beforeEach(() => {
  restored = restorePreservedReviewState(PRESERVED_S0);
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
});
