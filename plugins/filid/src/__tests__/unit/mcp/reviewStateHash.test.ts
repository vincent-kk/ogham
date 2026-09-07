import { chmodSync, mkdtempSync, rmSync, utimesSync } from 'node:fs';

import {
  portableJoin,
  resolveContainedPath,
  spawnCliSync,
  tmp,
} from '@ogham/cross-platform';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  REVIEW_STATE_ACTIONS,
  REVIEW_STATE_DELETED_FILE_HASH,
} from '../../../constants/reviewState.js';
import { handleReviewState } from '../../../mcp/tools/reviewState/index.js';

import { commitReviewStateFixture } from './reviewState/helpers/commitReviewStateFixture.js';
import { createReviewRulePluginRoot } from './reviewState/helpers/createReviewRulePluginRoot.js';
import { readPreparedReviewState } from './reviewState/helpers/readPreparedReviewState.js';
import { writeReviewStateFixtureFile } from './reviewState/helpers/writeReviewStateFixtureFile.js';

/** Temporary repository exercised by source-hash tests. */
let projectRoot: string;

/** Temporary plugin root containing the minimal review-rule map. */
let fixturePluginRoot: string;

/** Host plugin-root value restored after each test. */
let originalPluginRoot: string | undefined;

const controlCharacterPathsUnsupported = process.platform === 'win32';

/**
 * Runs a Git command against the temporary source-hash repository.
 *
 * @param args - Git arguments excluding the executable name.
 * @returns The command's standard output without trailing line breaks.
 * @throws When Git cannot start or exits unsuccessfully.
 */
function git(args: readonly string[]): string {
  const result = spawnCliSync('git', args, { cwd: projectRoot });
  if (result.code !== 0 || result.spawnError)
    throw new Error(result.stderr || result.spawnError?.message);
  return result.stdout.trimEnd();
}

/**
 * Prepares a fresh review-state snapshot for the fixture branch.
 *
 * @returns The prepared review-state payload.
 */
async function sourceState() {
  return handleReviewState({
    action: REVIEW_STATE_ACTIONS.PREPARE,
    projectRoot,
    branchName: 'feature/hash',
    baseRef: 'main',
    force: true,
  });
}

beforeEach(() => {
  originalPluginRoot = process.env.CLAUDE_PLUGIN_ROOT;
  fixturePluginRoot = createReviewRulePluginRoot();
  process.env.CLAUDE_PLUGIN_ROOT = fixturePluginRoot;
  projectRoot = mkdtempSync(portableJoin(tmp(), 'filid-review-hash-'));
  git(['init', '-b', 'main']);
  git(['config', 'user.email', 'filid@example.test']);
  git(['config', 'user.name', 'Filid Test']);
  writeReviewStateFixtureFile(projectRoot, 'tracked', 'base\n');
  commitReviewStateFixture(projectRoot, 'base');
  git(['checkout', '-b', 'feature/hash']);
  writeReviewStateFixtureFile(projectRoot, 'tracked', 'feature\n');
  commitReviewStateFixture(projectRoot, 'feature');
});

afterEach(() => {
  rmSync(projectRoot, { recursive: true, force: true });
  rmSync(fixturePluginRoot, { recursive: true, force: true });
  if (originalPluginRoot === undefined) delete process.env.CLAUDE_PLUGIN_ROOT;
  else process.env.CLAUDE_PLUGIN_ROOT = originalPluginRoot;
});

describe('review_state committed source hash', () => {
  it('changes when committed file content changes', async () => {
    const before = await sourceState();
    const beforeState = readPreparedReviewState(before);
    writeReviewStateFixtureFile(projectRoot, 'tracked', 'changed\n');
    commitReviewStateFixture(projectRoot, 'content change');
    const after = await sourceState();

    expect(readPreparedReviewState(after).sourceHash).not.toBe(
      beforeState.sourceHash,
    );
    expect(readPreparedReviewState(after).fileHashes.tracked).not.toBe(
      beforeState.fileHashes.tracked,
    );
  });

  it('stays stable across amend when committed tree content is unchanged', async () => {
    const before = await sourceState();
    const beforeState = readPreparedReviewState(before);
    git(['commit', '--amend', '--no-edit']);
    const after = await sourceState();

    expect(readPreparedReviewState(after).sourceHash).toBe(
      beforeState.sourceHash,
    );
    expect(readPreparedReviewState(after).fileHashes).toEqual(
      beforeState.fileHashes,
    );
  });

  it('ignores uncommitted working-tree content', async () => {
    const before = await sourceState();
    const beforeState = readPreparedReviewState(before);
    writeReviewStateFixtureFile(projectRoot, 'tracked', 'working tree only\n');
    const after = await sourceState();

    expect(readPreparedReviewState(after).sourceHash).toBe(
      beforeState.sourceHash,
    );
    expect(readPreparedReviewState(after).fileHashes).toEqual(
      beforeState.fileHashes,
    );
  });

  it('ignores mtime-only changes', async () => {
    const before = await sourceState();
    const beforeState = readPreparedReviewState(before);
    const filePath = resolveContainedPath(projectRoot, 'tracked');
    const future = new Date(Date.now() + 60_000);
    utimesSync(filePath, future, future);
    const after = await sourceState();

    expect(readPreparedReviewState(after).sourceHash).toBe(
      beforeState.sourceHash,
    );
  });

  it('uses a stable sentinel for committed deletions', async () => {
    rmSync(resolveContainedPath(projectRoot, 'tracked'));
    commitReviewStateFixture(projectRoot, 'delete tracked');

    const state = await sourceState();

    expect(readPreparedReviewState(state).fileHashes.tracked).toBe(
      REVIEW_STATE_DELETED_FILE_HASH,
    );
  });

  it('includes committed tree mode in the source hash', async () => {
    const before = await sourceState();
    const beforeState = readPreparedReviewState(before);
    const filePath = resolveContainedPath(projectRoot, 'tracked');
    chmodSync(filePath, 0o755);
    commitReviewStateFixture(projectRoot, 'make executable');
    const after = await sourceState();

    expect(readPreparedReviewState(after).fileHashes.tracked).toBe(
      beforeState.fileHashes.tracked,
    );
    expect(readPreparedReviewState(after).sourceHash).not.toBe(
      beforeState.sourceHash,
    );
  });

  it.skipIf(controlCharacterPathsUnsupported)(
    'preserves newline-containing paths from NUL-delimited Git output',
    async () => {
      const relativePath = 'line\nbreak';
      writeReviewStateFixtureFile(projectRoot, relativePath, 'newline path\n');
      commitReviewStateFixture(projectRoot, 'newline path');

      const state = await sourceState();

      expect(readPreparedReviewState(state).fileHashes[relativePath]).toMatch(
        /^[0-9a-f]{40,64}$/,
      );
    },
  );

  it.skipIf(controlCharacterPathsUnsupported)(
    'preserves tab-containing paths from NUL-delimited tree output',
    async () => {
      const relativePath = 'tab\tpath';
      writeReviewStateFixtureFile(projectRoot, relativePath, 'tab path\n');
      commitReviewStateFixture(projectRoot, 'tab path');

      const state = await sourceState();

      expect(readPreparedReviewState(state).fileHashes[relativePath]).toMatch(
        /^[0-9a-f]{40,64}$/,
      );
    },
  );

  it('changes when the selected merge base changes', async () => {
    git(['branch', 'older-base', 'main~0']);
    git(['checkout', 'main']);
    writeReviewStateFixtureFile(projectRoot, 'base-only', 'later base\n');
    commitReviewStateFixture(projectRoot, 'advance main');
    git(['checkout', 'feature/hash']);
    git(['rebase', 'main']);

    const currentBase = await sourceState();
    const currentBaseState = readPreparedReviewState(currentBase);
    const olderBase = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: 'feature/hash',
      baseRef: 'older-base',
      force: true,
    });

    expect(readPreparedReviewState(olderBase).baseCommit).not.toBe(
      currentBaseState.baseCommit,
    );
    expect(readPreparedReviewState(olderBase).sourceHash).not.toBe(
      currentBaseState.sourceHash,
    );
  });
});
