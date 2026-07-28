import { mkdtempSync, rmSync } from 'node:fs';

import {
  readUtf8FileIfExistsSync,
  writeFileAtomicallySync,
} from '@ogham/cross-platform/filesystem';
import {
  portableJoin,
  resolveContainedPath,
  tmp,
} from '@ogham/cross-platform/paths';
import { spawnCliSync } from '@ogham/cross-platform/spawn';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  REVIEW_STATE_ACTIONS,
  REVIEW_STATE_DIAGNOSTIC_CODES,
  REVIEW_STATE_DISPOSITIONS,
  REVIEW_STATE_FILE_NAMES,
  REVIEW_STATE_PHASES,
} from '../../../constants/reviewState.js';
import { handleReviewState } from '../../../mcp/tools/reviewState/index.js';

let projectRoot: string;

function git(args: readonly string[]): string {
  const result = spawnCliSync('git', args, { cwd: projectRoot });
  if (result.code !== 0 || result.spawnError)
    throw new Error(result.stderr || result.spawnError?.message);
  return result.stdout.trimEnd();
}

function commitFile(content: string, message: string): void {
  writeFileAtomicallySync(
    resolveContainedPath(projectRoot, 'tracked'),
    content,
  );
  git(['add', '--', 'tracked']);
  git(['commit', '-m', message]);
}

beforeEach(() => {
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
    expect(second.data?.state).toEqual(first.data?.state);
  });

  it('uses a sealed matching state only when its report exists', async () => {
    const prepared = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: 'feature/cache',
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
      branchName: 'feature/cache',
    });

    const cached = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: 'feature/cache',
      baseRef: 'main',
    });

    expect(cached.summary.disposition).toBe(REVIEW_STATE_DISPOSITIONS.CACHED);
    expect(cached.data.state!.phase).toBe(REVIEW_STATE_PHASES.SEALED);
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
    writeFileAtomicallySync(reportPath, '# Review\n');
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
    expect(refreshed.data.state!.phase).toBe(REVIEW_STATE_PHASES.PREPARED);
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
    writeFileAtomicallySync(reportPath, '# Old review\n');
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
        code: REVIEW_STATE_DIAGNOSTIC_CODES.REPORT_MISSING,
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
    writeFileAtomicallySync(reportPath, '# Old review\n');
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
    expect(checkpoint.data?.state?.baseRef).toBe(prepared.data.state!.baseRef);
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
    writeFileAtomicallySync(reportPath, '# Review\n');
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
    expect(slash.data.state!.normalizedBranch).not.toBe(
      dashes.data.state!.normalizedBranch,
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
});
