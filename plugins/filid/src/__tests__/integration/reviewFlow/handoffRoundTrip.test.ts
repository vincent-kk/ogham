import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleReviewState } from '../../../mcp/tools/reviewState/index.js';
import { parseHandoffBlock } from '../../../mcp/tools/reviewState/scope/parseHandoffBlock.js';
import { resolveReviewStatePaths } from '../../../mcp/tools/reviewState/state/resolveReviewStatePaths.js';
import type { ReviewStateRecord } from '../../../mcp/tools/reviewState/state/reviewStateTypes.js';
import { completeIncrementalReview } from '../../unit/mcp/reviewState/helpers/completeIncrementalReview.js';
import { createReviewRulePluginRoot } from '../../unit/mcp/reviewState/helpers/createReviewRulePluginRoot.js';
import { readPreparedReviewState } from '../../unit/mcp/reviewState/helpers/readPreparedReviewState.js';

import {
  PINNED_REVIEW_BRANCH,
  createPinnedReviewRepository,
} from './helpers/createPinnedReviewRepository.js';
import { restoreHostPluginRoot } from './helpers/restoreHostPluginRoot.js';
import { INTENT_GAP_REVIEW_REPOSITORY } from './helpers/reviewFlowRepositoryFiles.js';

/** PR description sections written above the handoff block by pull-request. */
const PR_SUMMARY = '## Summary\n\nBump both fixture values.\n\n';

/** Repository whose two INTENT.md gaps become handoff claims. */
let projectRoot: string;
/** Plugin root holding the fixture rules and actor methods. */
let pluginRoot: string;
/** Host plugin root restored after each case. */
const originalPluginRoot = process.env.CLAUDE_PLUGIN_ROOT;

/**
 * Generate the Stage 1 handoff section and wrap it in a PR body.
 * @returns PR body text and the handoff snapshot hash.
 */
async function writePullRequestBody() {
  const handoff = await handleReviewState({
    action: 'handoff',
    projectRoot,
    branchName: PINNED_REVIEW_BRANCH,
    baseRef: 'main',
    documentSync: 'committed',
    repaired: 0,
  });
  return {
    body: `${PR_SUMMARY}${readFileSync(handoff.data.handoffPath, 'utf8')}`,
    snapshotHash: handoff.summary.snapshotHash,
    recorded: handoff.summary.recorded,
  };
}

/**
 * Prepare with the given PR body as change context.
 * @param changeContext PR body carrying or lacking the handoff block.
 * @returns Prepared state.
 */
async function prepareWith(changeContext: string): Promise<ReviewStateRecord> {
  return readPreparedReviewState(
    await handleReviewState({
      action: 'prepare',
      projectRoot,
      branchName: PINNED_REVIEW_BRANCH,
      baseRef: 'main',
      effort: 'low',
      changeContext,
    }),
  );
}

beforeEach(async () => {
  pluginRoot = createReviewRulePluginRoot();
  process.env.CLAUDE_PLUGIN_ROOT = pluginRoot;
  projectRoot = await createPinnedReviewRepository(INTENT_GAP_REVIEW_REPOSITORY);
});
afterEach(() => {
  rmSync(projectRoot, { recursive: true, force: true });
  rmSync(pluginRoot, { recursive: true, force: true });
  restoreHostPluginRoot(originalPluginRoot);
});

describe('handoff → PR body → next prepare claims', () => {
  it('carries every recorded claim and the snapshot into the next prepare', async () => {
    const { body, snapshotHash, recorded } = await writePullRequestBody();
    const parsed = parseHandoffBlock(body);
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.handoff?.recorded).toHaveLength(recorded);
    expect(
      parsed.handoff?.recorded.map(({ ruleId, path }) => [ruleId, path]),
    ).toEqual(
      expect.arrayContaining([
        ['intent-document-contract', 'src/alpha'],
        ['intent-document-contract', 'src/beta'],
      ]),
    );
    const state = await prepareWith(body);
    expect(state.scope.snapshotHash).toBe(snapshotHash);
    expect(state.incremental?.changeContext).toBe(body);
    const brief = readFileSync(
      join(
        resolveReviewStatePaths(projectRoot, PINNED_REVIEW_BRANCH)
          .reviewDirectory,
        state.groups[0].briefPath,
      ),
      'utf8',
    );
    expect(brief).toContain('## FCA Handoff');
    expect(brief).toContain(`snapshot \`${snapshotHash}\``);
    for (const path of ['src/alpha', 'src/beta'])
      expect(brief).toMatch(
        new RegExp(`\\| intent-document-contract \\| ${path} \\|`),
      );
  });

  it('keeps the generation for the same PR body and re-reviews every file when the claims disappear', async () => {
    const { body } = await writePullRequestBody();
    const first = await prepareWith(body);
    await completeIncrementalReview(projectRoot);
    const repeated = await prepareWith(body);
    expect(repeated.generationId).toBe(first.generationId);
    const withoutClaims = await prepareWith(PR_SUMMARY);
    expect(withoutClaims.generationId).not.toBe(first.generationId);
    expect(
      withoutClaims.incremental?.decisions.map(({ reasons }) => reasons),
    ).toEqual([['evidence-changed']]);
  });
});
