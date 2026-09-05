import { mkdtempSync, rmSync } from 'node:fs';

import {
  ensureDirectorySync,
  portableJoin,
  readUtf8FileIfExistsSync,
  resolveContainedPath,
  spawnCliSync,
  tmp,
  writeFileAtomicallySync,
} from '@ogham/cross-platform';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  REVIEW_STATE_ACTIONS,
  REVIEW_STATE_DIAGNOSTIC_CODES,
  REVIEW_STATE_DISPOSITIONS,
  REVIEW_STATE_FILE_NAMES,
  REVIEW_STATE_PHASES,
} from '../../../constants/reviewState.js';
import { handleReviewState } from '../../../mcp/tools/reviewState/index.js';

import { createReviewRulePluginRoot } from './reviewState/helpers/createReviewRulePluginRoot.js';
import { readPreparedReviewState } from './reviewState/helpers/readPreparedReviewState.js';
import { validatePreparedReviewState } from './reviewState/helpers/validatePreparedReviewState.js';

/** Temporary repository exercised by cache-semantic tests. */
let projectRoot: string;

/** Temporary plugin root containing the minimal review-rule map. */
let fixturePluginRoot: string;

/** Host plugin-root value restored after each test. */
let originalPluginRoot: string | undefined;

/**
 * Runs a Git command against the temporary cache-semantics repository.
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
 * Replaces the tracked fixture content and commits it.
 *
 * @param content - Complete content to persist in the tracked fixture file.
 * @param message - Commit message used for the fixture revision.
 * @returns Nothing.
 */
function commitFile(content: string, message: string): void {
  writeFileAtomicallySync(
    resolveContainedPath(projectRoot, 'tracked'),
    content,
  );
  git(['add', '--', 'tracked']);
  git(['commit', '-m', message]);
}

beforeEach(() => {
  originalPluginRoot = process.env.CLAUDE_PLUGIN_ROOT;
  fixturePluginRoot = createReviewRulePluginRoot();
  process.env.CLAUDE_PLUGIN_ROOT = fixturePluginRoot;
  projectRoot = mkdtempSync(portableJoin(tmp(), 'filid-review-cache-'));
  git(['init', '-b', 'main']);
  git(['config', 'user.email', 'filid@example.test']);
  git(['config', 'user.name', 'Filid Test']);
  commitFile('base\n', 'base');
  git(['checkout', '-b', 'feature/cache']);
  commitFile('feature\n', 'feature');
});

afterEach(() => {
  rmSync(projectRoot, { recursive: true, force: true });
  rmSync(fixturePluginRoot, { recursive: true, force: true });
  if (originalPluginRoot === undefined) delete process.env.CLAUDE_PLUGIN_ROOT;
  else process.env.CLAUDE_PLUGIN_ROOT = originalPluginRoot;
});

describe('review_state cache semantics', () => {
  it('returns the same prepared record on a resumable prepare', async () => {
    const first = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: 'feature/cache',
      baseRef: 'main',
    });
    const second = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: 'feature/cache',
      baseRef: 'main',
    });

    expect(second.summary.disposition).toBe(
      REVIEW_STATE_DISPOSITIONS.RESUMABLE,
    );
    expect(readPreparedReviewState(second)).toEqual(
      readPreparedReviewState(first),
    );
  });

  it('uses a sealed matching state only when its report exists', async () => {
    const prepared = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: 'feature/cache',
      baseRef: 'main',
    });
    await validatePreparedReviewState({
      projectRoot,
      pluginRoot: fixturePluginRoot,
      branchName: 'feature/cache',
      originalPluginRoot,
      state: readPreparedReviewState(prepared),
    });
    await handleReviewState({
      action: REVIEW_STATE_ACTIONS.SEAL,
      projectRoot,
      branchName: 'feature/cache',
    });

    const cached = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: 'feature/cache',
      baseRef: 'main',
    });

    expect(cached.summary.disposition).toBe(REVIEW_STATE_DISPOSITIONS.CACHED);
    expect(readPreparedReviewState(cached).phase).toBe(
      REVIEW_STATE_PHASES.SEALED,
    );
  });

  it('re-prepares a sealed state whose report was removed', async () => {
    const prepared = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: 'feature/cache',
      baseRef: 'main',
    });
    const reportPath = resolveContainedPath(
      prepared.data?.reviewDirectory ?? '',
      REVIEW_STATE_FILE_NAMES.REPORT,
    );
    await validatePreparedReviewState({
      projectRoot,
      pluginRoot: fixturePluginRoot,
      branchName: 'feature/cache',
      originalPluginRoot,
      state: readPreparedReviewState(prepared),
    });
    await handleReviewState({
      action: REVIEW_STATE_ACTIONS.SEAL,
      projectRoot,
      branchName: 'feature/cache',
    });
    rmSync(reportPath);

    const refreshed = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: 'feature/cache',
      baseRef: 'main',
    });

    expect(refreshed.summary.disposition).toBe(REVIEW_STATE_DISPOSITIONS.FRESH);
    expect(readPreparedReviewState(refreshed).phase).toBe(
      REVIEW_STATE_PHASES.PREPARED,
    );
  });

  it('force prepare invalidates the sealed report before another seal', async () => {
    const prepared = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: 'feature/cache',
      baseRef: 'main',
    });
    const reportPath = resolveContainedPath(
      prepared.data.reviewDirectory,
      REVIEW_STATE_FILE_NAMES.REPORT,
    );
    await validatePreparedReviewState({
      projectRoot,
      pluginRoot: fixturePluginRoot,
      branchName: 'feature/cache',
      originalPluginRoot,
      state: readPreparedReviewState(prepared),
    });
    await handleReviewState({
      action: REVIEW_STATE_ACTIONS.SEAL,
      projectRoot,
      branchName: 'feature/cache',
    });
    const otherBranch = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: 'feature/other-cache',
      baseRef: 'main',
    });
    const otherReportPath = resolveContainedPath(
      otherBranch.data.reviewDirectory,
      REVIEW_STATE_FILE_NAMES.REPORT,
    );
    writeFileAtomicallySync(otherReportPath, '# Other branch review\n');

    const refreshed = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: 'feature/cache',
      baseRef: 'main',
      force: true,
    });
    const immediateSeal = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.SEAL,
      projectRoot,
      branchName: 'feature/cache',
    });

    expect(refreshed.summary.disposition).toBe(REVIEW_STATE_DISPOSITIONS.FRESH);
    expect(readUtf8FileIfExistsSync(reportPath)).toBeNull();
    expect(readUtf8FileIfExistsSync(otherReportPath)).toBe(
      '# Other branch review\n',
    );
    expect(immediateSeal.summary.disposition).toBe(
      REVIEW_STATE_DISPOSITIONS.MISSING,
    );
    expect(immediateSeal.diagnostics).toContainEqual(
      expect.objectContaining({
        code: REVIEW_STATE_DIAGNOSTIC_CODES.OPINIONS_MISSING,
      }),
    );
  });

  it('content-changing prepare invalidates the prior sealed report', async () => {
    const prepared = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: 'feature/cache',
      baseRef: 'main',
    });
    const reportPath = resolveContainedPath(
      prepared.data.reviewDirectory,
      REVIEW_STATE_FILE_NAMES.REPORT,
    );
    await validatePreparedReviewState({
      projectRoot,
      pluginRoot: fixturePluginRoot,
      branchName: 'feature/cache',
      originalPluginRoot,
      state: readPreparedReviewState(prepared),
    });
    await handleReviewState({
      action: REVIEW_STATE_ACTIONS.SEAL,
      projectRoot,
      branchName: 'feature/cache',
    });
    commitFile('new committed content\n', 'change source');

    const refreshed = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: 'feature/cache',
      baseRef: 'main',
    });
    const immediateSeal = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.SEAL,
      projectRoot,
      branchName: 'feature/cache',
    });

    expect(refreshed.summary.disposition).toBe(REVIEW_STATE_DISPOSITIONS.FRESH);
    expect(readUtf8FileIfExistsSync(reportPath)).toBeNull();
    expect(immediateSeal.summary.disposition).toBe(
      REVIEW_STATE_DISPOSITIONS.MISSING,
    );
  });

  it('returns stable missing state and diagnostics from checkpoint', async () => {
    const checkpoint = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.CHECKPOINT,
      projectRoot,
      branchName: 'feature/cache',
      baseRef: 'main',
    });

    expect(checkpoint.status).toBe('indeterminate');
    expect(checkpoint.summary.disposition).toBe(
      REVIEW_STATE_DISPOSITIONS.MISSING,
    );
    expect(checkpoint.diagnostics).toContainEqual(
      expect.objectContaining({
        code: REVIEW_STATE_DIAGNOSTIC_CODES.STATE_MISSING,
      }),
    );
  });

  it('uses the persisted base ref when checkpoint omits it', async () => {
    const prepared = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: 'feature/cache',
      baseRef: 'main',
    });

    const checkpoint = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.CHECKPOINT,
      projectRoot,
      branchName: 'feature/cache',
    });

    expect(checkpoint.summary.disposition).toBe(
      REVIEW_STATE_DISPOSITIONS.RESUMABLE,
    );
    expect(checkpoint.data?.state?.baseRef).toBe(
      readPreparedReviewState(prepared).baseRef,
    );
  });

  it('marks a checkpoint stale after committed content changes', async () => {
    await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: 'feature/cache',
      baseRef: 'main',
    });
    commitFile('changed after prepare\n', 'change reviewed content');

    const checkpoint = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.CHECKPOINT,
      projectRoot,
      branchName: 'feature/cache',
    });

    expect(checkpoint.status).toBe('indeterminate');
    expect(checkpoint.summary.disposition).toBe(
      REVIEW_STATE_DISPOSITIONS.STALE,
    );
    expect(checkpoint.diagnostics).toContainEqual(
      expect.objectContaining({
        code: REVIEW_STATE_DIAGNOSTIC_CODES.SOURCE_HASH_STALE,
      }),
    );
  });

  it('marks a sealed state with a missing report as stale', async () => {
    const prepared = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: 'feature/cache',
      baseRef: 'main',
    });
    const reportPath = resolveContainedPath(
      prepared.data?.reviewDirectory ?? '',
      REVIEW_STATE_FILE_NAMES.REPORT,
    );
    await validatePreparedReviewState({
      projectRoot,
      pluginRoot: fixturePluginRoot,
      branchName: 'feature/cache',
      originalPluginRoot,
      state: readPreparedReviewState(prepared),
    });
    await handleReviewState({
      action: REVIEW_STATE_ACTIONS.SEAL,
      projectRoot,
      branchName: 'feature/cache',
    });
    rmSync(reportPath);

    const checkpoint = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.CHECKPOINT,
      projectRoot,
      branchName: 'feature/cache',
    });

    expect(checkpoint.status).toBe('indeterminate');
    expect(checkpoint.summary.disposition).toBe(
      REVIEW_STATE_DISPOSITIONS.STALE,
    );
    expect(checkpoint.diagnostics).toContainEqual(
      expect.objectContaining({
        code: REVIEW_STATE_DIAGNOSTIC_CODES.REPORT_MISSING,
      }),
    );
  });

  it('uses collision-safe branch directory keys', async () => {
    const slash = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: 'feature/a',
      baseRef: 'main',
    });
    const dashes = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: 'feature--a',
      baseRef: 'main',
    });

    expect(slash.data?.reviewDirectory).not.toBe(dashes.data?.reviewDirectory);
    expect(readPreparedReviewState(slash).normalizedBranch).not.toBe(
      readPreparedReviewState(dashes).normalizedBranch,
    );
    expect(
      readUtf8FileIfExistsSync(slash.data?.statePath ?? ''),
    ).not.toBeNull();
    expect(
      readUtf8FileIfExistsSync(dashes.data?.statePath ?? ''),
    ).not.toBeNull();
  });

  it('returns canonical artifact paths in sorted order', async () => {
    const prepared = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: 'feature/cache',
      baseRef: 'main',
    });
    writeFileAtomicallySync(
      resolveContainedPath(
        prepared.data?.reviewDirectory ?? '',
        REVIEW_STATE_FILE_NAMES.VERIFICATION,
      ),
      '# Verification\n',
    );
    writeFileAtomicallySync(
      resolveContainedPath(
        prepared.data?.reviewDirectory ?? '',
        REVIEW_STATE_FILE_NAMES.SESSION,
      ),
      '# Session\n',
    );

    const checkpoint = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.CHECKPOINT,
      projectRoot,
      branchName: 'feature/cache',
    });

    expect(checkpoint.data?.artifactPaths).toEqual(
      [...(checkpoint.data?.artifactPaths ?? [])].sort(),
    );
    expect(checkpoint.data?.artifactPaths).toEqual(
      expect.arrayContaining([
        prepared.data?.statePath,
        resolveContainedPath(
          prepared.data?.reviewDirectory ?? '',
          REVIEW_STATE_FILE_NAMES.SESSION,
        ),
        resolveContainedPath(
          prepared.data?.reviewDirectory ?? '',
          REVIEW_STATE_FILE_NAMES.VERIFICATION,
        ),
      ]),
    );
  });

  it('reports bounded top-level and creation-ordered group artifact presence', async () => {
    ensureDirectorySync(resolveContainedPath(projectRoot, '.filid'));
    writeFileAtomicallySync(
      resolveContainedPath(projectRoot, '.filid/config.json'),
      `${JSON.stringify({
        version: '2.0',
        language: 'English',
        adapters: { mode: 'auto', enabled: [] },
        rules: {},
        structure: { generatedPaths: ['.filid/config.json'] },
        review: { effort: 'low', groupFileLimit: 1 },
      })}\n`,
    );
    writeFileAtomicallySync(
      resolveContainedPath(projectRoot, 'other'),
      'second changed source\n',
    );
    git(['add', '--all']);
    git(['commit', '-m', 'create two review groups']);
    const prepared = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: 'feature/cache',
      baseRef: 'main',
    });
    const groups = readPreparedReviewState(prepared).groups;
    expect(groups).toHaveLength(2);
    const reviewDirectory = prepared.data.reviewDirectory;
    rmSync(resolveContainedPath(reviewDirectory, groups[0].units[0].diffPath), {
      force: true,
    });
    rmSync(resolveContainedPath(reviewDirectory, groups[1].briefPath), {
      force: true,
    });
    writeFileAtomicallySync(
      resolveContainedPath(reviewDirectory, groups[0].opinionPath),
      '{}\n',
    );
    writeFileAtomicallySync(
      resolveContainedPath(reviewDirectory, groups[1].verifyPath),
      '{}\n',
    );

    const checkpoint = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.CHECKPOINT,
      projectRoot,
      branchName: 'feature/cache',
    });

    expect(checkpoint.summary.effort).toBe('low');
    expect(checkpoint.data.groups).toEqual(
      readPreparedReviewState(prepared).groups,
    );
    expect(checkpoint.data.artifacts).toEqual({
      briefs: false,
      diffs: false,
      groups: [
        { id: groups[0].id, opinion: true, verify: false },
        { id: groups[1].id, opinion: false, verify: true },
      ],
    });
  });
});
