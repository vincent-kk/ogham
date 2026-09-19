import { rmSync } from 'node:fs';

import { afterEach, describe, expect, it } from 'vitest';

import { handleReviewState } from '../../../mcp/tools/reviewState/index.js';
import type { ReviewStateRecord } from '../../../mcp/tools/reviewState/state/reviewStateTypes.js';
import { createReviewRulePluginRoot } from '../../unit/mcp/reviewState/helpers/createReviewRulePluginRoot.js';
import { readPreparedReviewState } from '../../unit/mcp/reviewState/helpers/readPreparedReviewState.js';

import {
  PINNED_REVIEW_BRANCH,
  type PinnedReviewRepositoryFiles,
  createPinnedReviewRepository,
} from './helpers/createPinnedReviewRepository.js';
import { normalizeReviewStateText } from './helpers/normalizeReviewStateText.js';
import { restoreHostPluginRoot } from './helpers/restoreHostPluginRoot.js';
import {
  INTENT_GAP_REVIEW_REPOSITORY,
  PLAIN_REVIEW_REPOSITORY,
} from './helpers/reviewFlowRepositoryFiles.js';

/** Temporary roots removed after each case. */
const created: string[] = [];
/** Host plugin root restored after each case. */
const originalPluginRoot = process.env.CLAUDE_PLUGIN_ROOT;

/** One independent prepare over a fresh byte-identical repository and plugin root. */
interface IsolatedPrepare {
  /** Prepared state. */
  state: ReviewStateRecord;
  /** State text with only the designed nondeterminism normalized. */
  normalized: string;
}

/**
 * Prepare a fresh copy of the given repository under its own temporary roots.
 * @param files Pinned base and feature contents.
 * @returns Prepared state and its normalized text.
 */
async function prepareIsolated(
  files: PinnedReviewRepositoryFiles,
): Promise<IsolatedPrepare> {
  const pluginRoot = createReviewRulePluginRoot();
  process.env.CLAUDE_PLUGIN_ROOT = pluginRoot;
  const projectRoot = createPinnedReviewRepository(files);
  created.push(pluginRoot, projectRoot);
  const state = readPreparedReviewState(
    await handleReviewState({
      action: 'prepare',
      projectRoot,
      branchName: PINNED_REVIEW_BRANCH,
      baseRef: 'main',
      effort: 'low',
    }),
  );
  return {
    state,
    normalized: normalizeReviewStateText(state, [
      state.projectRoot,
      pluginRoot,
    ]),
  };
}

afterEach(() => {
  for (const root of created.splice(0))
    rmSync(root, { recursive: true, force: true });
  restoreHostPluginRoot(originalPluginRoot);
});

describe('prepare determinism across byte-identical repositories', () => {
  it('produces the same normalized state when no FCA candidate exists', async () => {
    const first = await prepareIsolated(PLAIN_REVIEW_REPOSITORY);
    const second = await prepareIsolated(PLAIN_REVIEW_REPOSITORY);
    expect(first.state.scope.candidates).toEqual([]);
    expect(first.state.generationId).not.toBe(second.state.generationId);
    expect(second.normalized).toBe(first.normalized);
  });

  it('produces the same normalized state, hashes included, when FCA candidates exist', async () => {
    const first = await prepareIsolated(INTENT_GAP_REVIEW_REPOSITORY);
    const second = await prepareIsolated(INTENT_GAP_REVIEW_REPOSITORY);
    expect(first.state.scope.candidates).toHaveLength(2);
    for (const { message } of first.state.scope.candidates)
      expect(message).not.toContain(first.state.projectRoot);
    expect(second.normalized).toBe(first.normalized);
  });
});
