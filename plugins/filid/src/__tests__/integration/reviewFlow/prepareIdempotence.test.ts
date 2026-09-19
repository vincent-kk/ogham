import { rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleReviewState } from '../../../mcp/tools/reviewState/index.js';
import type { ReviewStateRecord } from '../../../mcp/tools/reviewState/state/reviewStateTypes.js';
import { createReviewRulePluginRoot } from '../../unit/mcp/reviewState/helpers/createReviewRulePluginRoot.js';
import { readPreparedReviewState } from '../../unit/mcp/reviewState/helpers/readPreparedReviewState.js';

import {
  PINNED_REVIEW_BRANCH,
  createPinnedReviewRepository,
} from './helpers/createPinnedReviewRepository.js';
import { restoreHostPluginRoot } from './helpers/restoreHostPluginRoot.js';
import {
  FIXTURE_INTENT,
  INTENT_GAP_REVIEW_REPOSITORY,
} from './helpers/reviewFlowRepositoryFiles.js';

/** Repository with two numbered INTENT.md candidates. */
let projectRoot: string;
/** Plugin root holding the fixture rules and actor methods. */
let pluginRoot: string;
/** Host plugin root restored after each case. */
const originalPluginRoot = process.env.CLAUDE_PLUGIN_ROOT;

/**
 * Prepare the fixture branch with fixed arguments.
 * @returns State referenced by the prepare response.
 */
async function prepare(): Promise<ReviewStateRecord> {
  return readPreparedReviewState(
    await handleReviewState({
      action: 'prepare',
      projectRoot,
      branchName: PINNED_REVIEW_BRANCH,
      baseRef: 'main',
      effort: 'low',
    }),
  );
}

/**
 * Read one file's recorded evidence identity across all groups.
 * @param state Prepared state.
 * @param path Changed file path.
 * @returns The file's evidenceHash, or undefined when no group assigns it.
 */
function fileEvidenceHash(
  state: ReviewStateRecord,
  path: string,
): string | undefined {
  return state.groups.find((group) => group.fileInputs?.[path])?.fileInputs?.[
    path
  ].evidenceHash;
}

beforeEach(() => {
  pluginRoot = createReviewRulePluginRoot();
  process.env.CLAUDE_PLUGIN_ROOT = pluginRoot;
  projectRoot = createPinnedReviewRepository(INTENT_GAP_REVIEW_REPOSITORY);
});
afterEach(() => {
  rmSync(projectRoot, { recursive: true, force: true });
  rmSync(pluginRoot, { recursive: true, force: true });
  restoreHostPluginRoot(originalPluginRoot);
});

describe('prepare idempotence', () => {
  it('keeps the active generation when prepare repeats with the same inputs', async () => {
    const first = await prepare();
    const second = await prepare();
    expect(second.generationId).toBe(first.generationId);
    expect(second.scope).toEqual(first.scope);
    expect(second.groups).toEqual(first.groups);
  });

  it('current behavior: one uncommitted INTENT.md renumbers candidates and publishes a new generation', async () => {
    const first = await prepare();
    expect(first.scope.candidates.map(({ id, path }) => [id, path])).toEqual([
      ['FCA-001', 'src/alpha'],
      ['FCA-002', 'src/beta'],
    ]);
    writeFileSync(
      join(first.projectRoot, 'src/alpha/INTENT.md'),
      FIXTURE_INTENT,
    );
    const second = await prepare();
    expect(second.sourceHash).toBe(first.sourceHash);
    expect(second.scope.snapshotHash).not.toBe(first.scope.snapshotHash);
    expect(second.scope.candidates.map(({ id, path }) => [id, path])).toEqual([
      ['FCA-001', 'src/beta'],
    ]);
    expect(second.generationId).not.toBe(first.generationId);
    expect(fileEvidenceHash(second, 'src/beta/index.ts')).toBe(
      fileEvidenceHash(first, 'src/beta/index.ts'),
    );
  });
});
