import { mkdtempSync, rmSync, symlinkSync } from 'node:fs';

import {
  ensureDirectorySync,
  listDirectoryIfExistsSync,
  portableDirname,
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
  REVIEW_STATE_DIRECTORY_NAMES,
  REVIEW_STATE_DISPOSITIONS,
  REVIEW_STATE_FILE_NAMES,
  REVIEW_STATE_PHASES,
  REVIEW_STATE_SCHEMA_VERSION,
} from '../../../constants/reviewState.js';
import { handleReviewState } from '../../../mcp/tools/reviewState/index.js';

import { commitReviewStateFixture } from './reviewState/helpers/commitReviewStateFixture.js';
import { createReviewRulePluginRoot } from './reviewState/helpers/createReviewRulePluginRoot.js';
import { readPreparedReviewState } from './reviewState/helpers/readPreparedReviewState.js';
import { validatePreparedReviewState } from './reviewState/helpers/validatePreparedReviewState.js';

/** Temporary repository exercised by lifecycle tests. */
let projectRoot: string;

/** Temporary path used to verify containment behavior. */
let externalRoot: string;

/** Temporary plugin root containing the minimal review-rule map. */
let fixturePluginRoot: string;

/** Host plugin-root value restored after each test. */
let originalPluginRoot: string | undefined;
const INVALID_CLEANUP_BRANCH_NAMES = ['', '../feature'] as const;

/**
 * Runs a Git command against the temporary lifecycle repository.
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
 * Writes one fixture file below the temporary repository root.
 *
 * @param relativePath - Repository-relative destination path.
 * @param content - Complete UTF-8 file content.
 * @returns Nothing.
 */
function writeProjectFile(relativePath: string, content: string): void {
  const filePath = resolveContainedPath(projectRoot, relativePath);
  ensureDirectorySync(portableDirname(filePath));
  writeFileAtomicallySync(filePath, content);
}

beforeEach(() => {
  originalPluginRoot = process.env.CLAUDE_PLUGIN_ROOT;
  fixturePluginRoot = createReviewRulePluginRoot();
  process.env.CLAUDE_PLUGIN_ROOT = fixturePluginRoot;
  projectRoot = mkdtempSync(portableJoin(tmp(), 'filid-review-lifecycle-'));
  externalRoot = mkdtempSync(portableJoin(tmp(), 'filid-review-external-'));
  git(['init', '-b', 'main']);
  git(['config', 'user.email', 'filid@example.test']);
  git(['config', 'user.name', 'Filid Test']);
  writeProjectFile('src/value', 'base\n');
  commitReviewStateFixture(projectRoot, 'base');
  git(['checkout', '-b', 'feature/lifecycle']);
  writeProjectFile('src/value', 'feature\n');
  commitReviewStateFixture(projectRoot, 'feature');
});

afterEach(() => {
  rmSync(projectRoot, { recursive: true, force: true });
  rmSync(externalRoot, { recursive: true, force: true });
  rmSync(fixturePluginRoot, { recursive: true, force: true });
  if (originalPluginRoot === undefined) delete process.env.CLAUDE_PLUGIN_ROOT;
  else process.env.CLAUDE_PLUGIN_ROOT = originalPluginRoot;
});

describe('review_state lifecycle', () => {
  it('prepares a fresh branch-scoped state record', async () => {
    const result = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: 'feature/lifecycle',
      baseRef: 'main',
    });

    expect(result.status).toBe('ok');
    expect(result.summary.disposition).toBe(REVIEW_STATE_DISPOSITIONS.FRESH);
    const state = readPreparedReviewState(result);
    expect(state).toMatchObject({
      schemaVersion: REVIEW_STATE_SCHEMA_VERSION,
      projectRoot,
      branchName: 'feature/lifecycle',
      baseRef: 'main',
      phase: REVIEW_STATE_PHASES.PREPARED,
    });
    expect(state.normalizedBranch).not.toContain('/');
    expect(
      JSON.parse(readUtf8FileIfExistsSync(result.data?.statePath ?? '') ?? ''),
    ).toEqual(state);
  });

  it('resumes a matching prepared checkpoint without rewriting it', async () => {
    const prepared = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: 'feature/lifecycle',
      baseRef: 'main',
    });
    const checkpoint = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.CHECKPOINT,
      projectRoot,
      branchName: 'feature/lifecycle',
    });

    expect(checkpoint.status).toBe('ok');
    expect(checkpoint.summary.disposition).toBe(
      REVIEW_STATE_DISPOSITIONS.RESUMABLE,
    );
    expect(checkpoint.data?.state).toEqual(readPreparedReviewState(prepared));
  });

  it('does not seal a prepared state without merged review opinions', async () => {
    const prepared = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: 'feature/lifecycle',
      baseRef: 'main',
    });
    const stateBeforeSeal = readPreparedReviewState(prepared);
    const sealed = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.SEAL,
      projectRoot,
      branchName: 'feature/lifecycle',
    });

    expect(sealed.status).toBe('indeterminate');
    expect(sealed.summary.disposition).toBe(REVIEW_STATE_DISPOSITIONS.MISSING);
    expect(sealed.diagnostics).toContainEqual(
      expect.objectContaining({
        code: REVIEW_STATE_DIAGNOSTIC_CODES.OPINIONS_MISSING,
      }),
    );
    expect(readPreparedReviewState(prepared)).toEqual(stateBeforeSeal);
  });

  it('seals a matching prepared state and serves it as cached', async () => {
    const prepared = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: 'feature/lifecycle',
      baseRef: 'main',
    });
    const reportPath = resolveContainedPath(
      prepared.data?.reviewDirectory ?? '',
      REVIEW_STATE_FILE_NAMES.REPORT,
    );
    await validatePreparedReviewState({
      projectRoot,
      pluginRoot: fixturePluginRoot,
      branchName: 'feature/lifecycle',
      originalPluginRoot,
      state: readPreparedReviewState(prepared),
    });

    const sealed = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.SEAL,
      projectRoot,
      branchName: 'feature/lifecycle',
    });
    const checkpoint = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.CHECKPOINT,
      projectRoot,
      branchName: 'feature/lifecycle',
    });

    expect(sealed.status).toBe('ok');
    expect(sealed.summary.disposition).toBe(REVIEW_STATE_DISPOSITIONS.SEALED);
    expect(readPreparedReviewState(prepared).phase).toBe(
      REVIEW_STATE_PHASES.SEALED,
    );
    expect(readPreparedReviewState(prepared).sealedAt).toBeDefined();
    expect(checkpoint.summary.disposition).toBe(
      REVIEW_STATE_DISPOSITIONS.CACHED,
    );
    expect(checkpoint.data?.reportPath).toBe(reportPath);
  });

  it('reports stale and preserves prepared state when committed content changes', async () => {
    const prepared = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: 'feature/lifecycle',
      baseRef: 'main',
    });
    const stateBeforeSeal = readPreparedReviewState(prepared);
    writeProjectFile('src/value', 'changed after prepare\n');
    commitReviewStateFixture(projectRoot, 'change reviewed content');

    const sealed = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.SEAL,
      projectRoot,
      branchName: 'feature/lifecycle',
    });

    expect(sealed.status).toBe('indeterminate');
    expect(sealed.summary.disposition).toBe(REVIEW_STATE_DISPOSITIONS.STALE);
    expect(sealed.diagnostics).toContainEqual(
      expect.objectContaining({
        code: REVIEW_STATE_DIAGNOSTIC_CODES.SOURCE_HASH_STALE,
      }),
    );
    expect(readPreparedReviewState(prepared)).toEqual(stateBeforeSeal);
  });

  it('force prepares a fresh state instead of using a sealed cache', async () => {
    const prepared = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: 'feature/lifecycle',
      baseRef: 'main',
    });
    await validatePreparedReviewState({
      projectRoot,
      pluginRoot: fixturePluginRoot,
      branchName: 'feature/lifecycle',
      originalPluginRoot,
      state: readPreparedReviewState(prepared),
    });
    await handleReviewState({
      action: REVIEW_STATE_ACTIONS.SEAL,
      projectRoot,
      branchName: 'feature/lifecycle',
    });

    const forced = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: 'feature/lifecycle',
      baseRef: 'main',
      force: true,
    });

    expect(forced.summary.disposition).toBe(REVIEW_STATE_DISPOSITIONS.FRESH);
    expect(readPreparedReviewState(forced).phase).toBe(
      REVIEW_STATE_PHASES.PREPARED,
    );
    expect(readPreparedReviewState(forced).sealedAt).toBeUndefined();
  });

  it('requires literal confirmation before cleanup', async () => {
    await expect(
      handleReviewState({
        action: REVIEW_STATE_ACTIONS.CLEANUP,
        projectRoot,
        branchName: 'feature/lifecycle',
        confirm: false,
      }),
    ).rejects.toThrow('confirm must be true');
  });

  it('cleans only the selected branch directory', async () => {
    await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: 'feature/one',
      baseRef: 'main',
    });
    await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: 'feature/two',
      baseRef: 'main',
    });

    const cleaned = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.CLEANUP,
      projectRoot,
      branchName: 'feature/one',
      confirm: true,
    });
    const first = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.CHECKPOINT,
      projectRoot,
      branchName: 'feature/one',
    });
    const second = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.CHECKPOINT,
      projectRoot,
      branchName: 'feature/two',
    });

    expect(cleaned.summary.disposition).toBe(REVIEW_STATE_DISPOSITIONS.CLEANED);
    expect(first.summary.disposition).toBe(REVIEW_STATE_DISPOSITIONS.MISSING);
    expect(second.summary.disposition).toBe(
      REVIEW_STATE_DISPOSITIONS.RESUMABLE,
    );
  });

  it('refuses cleanup through a descendant review-root symlink', async () => {
    const prepared = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: 'feature/lifecycle',
      baseRef: 'main',
    });
    const reviewRoot = resolveContainedPath(
      projectRoot,
      REVIEW_STATE_DIRECTORY_NAMES.FILID,
      REVIEW_STATE_DIRECTORY_NAMES.REVIEW,
    );
    const externalBranch = resolveContainedPath(
      externalRoot,
      readPreparedReviewState(prepared).normalizedBranch,
    );
    const markerPath = resolveContainedPath(externalBranch, 'marker');
    ensureDirectorySync(externalBranch);
    writeFileAtomicallySync(markerPath, 'outside\n');
    rmSync(reviewRoot, { recursive: true, force: true });
    symlinkSync(
      externalRoot,
      reviewRoot,
      process.platform === 'win32' ? 'junction' : 'dir',
    );

    await expect(
      handleReviewState({
        action: REVIEW_STATE_ACTIONS.CLEANUP,
        projectRoot,
        branchName: 'feature/lifecycle',
        confirm: true,
      }),
    ).rejects.toThrow('symbolic link');
    expect(readUtf8FileIfExistsSync(markerPath)).toBe('outside\n');
  });

  it('refuses prepare through a descendant review-root symlink', async () => {
    const filidRoot = resolveContainedPath(
      projectRoot,
      REVIEW_STATE_DIRECTORY_NAMES.FILID,
    );
    const reviewRoot = resolveContainedPath(
      filidRoot,
      REVIEW_STATE_DIRECTORY_NAMES.REVIEW,
    );
    ensureDirectorySync(filidRoot);
    symlinkSync(
      externalRoot,
      reviewRoot,
      process.platform === 'win32' ? 'junction' : 'dir',
    );

    await expect(
      handleReviewState({
        action: REVIEW_STATE_ACTIONS.PREPARE,
        projectRoot,
        branchName: 'feature/lifecycle',
        baseRef: 'main',
      }),
    ).rejects.toThrow('symbolic link');
    expect(listDirectoryIfExistsSync(externalRoot)).toEqual([]);
  });

  it('rejects empty and traversal-like cleanup branch names', async () => {
    for (const branchName of INVALID_CLEANUP_BRANCH_NAMES)
      await expect(
        handleReviewState({
          action: REVIEW_STATE_ACTIONS.CLEANUP,
          projectRoot,
          branchName,
          confirm: true,
        }),
      ).rejects.toThrow('branchName');
  });
});
