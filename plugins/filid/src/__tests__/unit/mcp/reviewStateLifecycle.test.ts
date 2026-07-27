import { mkdtempSync, rmSync, symlinkSync } from 'node:fs';

import {
  ensureDirectorySync,
  listDirectoryIfExistsSync,
  readUtf8FileIfExistsSync,
  writeFileAtomicallySync,
} from '@ogham/cross-platform/filesystem';
import {
  portableDirname,
  portableJoin,
  resolveContainedPath,
  tmp,
} from '@ogham/cross-platform/paths';
import { spawnCliSync } from '@ogham/cross-platform/spawn';
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

let projectRoot: string;
let externalRoot: string;
const INVALID_CLEANUP_BRANCH_NAMES = ['', '../feature'] as const;

function git(args: readonly string[]): string {
  const result = spawnCliSync('git', args, { cwd: projectRoot });
  if (result.code !== 0 || result.spawnError)
    throw new Error(result.stderr || result.spawnError?.message);
  return result.stdout.trimEnd();
}

function writeProjectFile(relativePath: string, content: string): void {
  const filePath = resolveContainedPath(projectRoot, relativePath);
  ensureDirectorySync(portableDirname(filePath));
  writeFileAtomicallySync(filePath, content);
}

function commit(message: string): void {
  git(['add', '--all']);
  git(['commit', '-m', message]);
}

beforeEach(() => {
  projectRoot = mkdtempSync(portableJoin(tmp(), 'filid-review-lifecycle-'));
  externalRoot = mkdtempSync(portableJoin(tmp(), 'filid-review-external-'));
  git(['init', '-b', 'main']);
  git(['config', 'user.email', 'filid@example.test']);
  git(['config', 'user.name', 'Filid Test']);
  writeProjectFile('src/value', 'base\n');
  commit('base');
  git(['checkout', '-b', 'feature/lifecycle']);
  writeProjectFile('src/value', 'feature\n');
  commit('feature');
});

afterEach(() => {
  rmSync(projectRoot, { recursive: true, force: true });
  rmSync(externalRoot, { recursive: true, force: true });
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
    expect(result.data?.state).toMatchObject({
      schemaVersion: REVIEW_STATE_SCHEMA_VERSION,
      projectRoot,
      branchName: 'feature/lifecycle',
      baseRef: 'main',
      phase: REVIEW_STATE_PHASES.PREPARED,
    });
    expect(result.data.state!.normalizedBranch).not.toContain('/');
    expect(
      JSON.parse(readUtf8FileIfExistsSync(result.data?.statePath ?? '') ?? ''),
    ).toEqual(result.data?.state);
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
    expect(checkpoint.data?.state).toEqual(prepared.data?.state);
  });

  it('does not seal a prepared state without a review report', async () => {
    const prepared = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: 'feature/lifecycle',
      baseRef: 'main',
    });
    const sealed = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.SEAL,
      projectRoot,
      branchName: 'feature/lifecycle',
    });

    expect(sealed.status).toBe('indeterminate');
    expect(sealed.summary.disposition).toBe(REVIEW_STATE_DISPOSITIONS.MISSING);
    expect(sealed.diagnostics).toContainEqual(
      expect.objectContaining({
        code: REVIEW_STATE_DIAGNOSTIC_CODES.REPORT_MISSING,
      }),
    );
    expect(sealed.data?.state).toEqual(prepared.data?.state);
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
    writeFileAtomicallySync(reportPath, '# Review\n');

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
    expect(sealed.data?.state?.phase).toBe(REVIEW_STATE_PHASES.SEALED);
    expect(sealed.data?.state?.sealedAt).toBeDefined();
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
    writeProjectFile('src/value', 'changed after prepare\n');
    commit('change reviewed content');

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
    expect(sealed.data?.state).toEqual(prepared.data?.state);
  });

  it('force prepares a fresh state instead of using a sealed cache', async () => {
    const prepared = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: 'feature/lifecycle',
      baseRef: 'main',
    });
    writeFileAtomicallySync(
      resolveContainedPath(
        prepared.data?.reviewDirectory ?? '',
        REVIEW_STATE_FILE_NAMES.REPORT,
      ),
      '# Review\n',
    );
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
    expect(forced.data.state!.phase).toBe(REVIEW_STATE_PHASES.PREPARED);
    expect(forced.data.state!.sealedAt).toBeUndefined();
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
      prepared.data.state!.normalizedBranch,
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
