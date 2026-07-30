import { chmodSync, mkdtempSync, rmSync, utimesSync } from 'node:fs';

import {
  portableJoin,
  resolveContainedPath,
  spawnCliSync,
  tmp,
  writeFileAtomicallySync,
} from '@ogham/cross-platform';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  REVIEW_STATE_ACTIONS,
  REVIEW_STATE_DELETED_FILE_HASH,
} from '../../../constants/reviewState.js';
import { handleReviewState } from '../../../mcp/tools/reviewState/index.js';

let projectRoot: string;

const controlCharacterPathsUnsupported = process.platform === 'win32';

function git(args: readonly string[]): string {
  const result = spawnCliSync('git', args, { cwd: projectRoot });
  if (result.code !== 0 || result.spawnError)
    throw new Error(result.stderr || result.spawnError?.message);
  return result.stdout.trimEnd();
}

function write(relativePath: string, content: string): void {
  writeFileAtomicallySync(
    resolveContainedPath(projectRoot, relativePath),
    content,
  );
}

function commit(message: string): void {
  git(['add', '--all']);
  git(['commit', '-m', message]);
}

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
  projectRoot = mkdtempSync(portableJoin(tmp(), 'filid-review-hash-'));
  git(['init', '-b', 'main']);
  git(['config', 'user.email', 'filid@example.test']);
  git(['config', 'user.name', 'Filid Test']);
  write('tracked', 'base\n');
  commit('base');
  git(['checkout', '-b', 'feature/hash']);
  write('tracked', 'feature\n');
  commit('feature');
});

afterEach(() => {
  rmSync(projectRoot, { recursive: true, force: true });
});

describe('review_state committed source hash', () => {
  it('changes when committed file content changes', async () => {
    const before = await sourceState();
    write('tracked', 'changed\n');
    commit('content change');
    const after = await sourceState();

    expect(after.data.state!.sourceHash).not.toBe(
      before.data.state!.sourceHash,
    );
    expect(after.data.state!.fileHashes.tracked).not.toBe(
      before.data.state!.fileHashes.tracked,
    );
  });

  it('stays stable across amend when committed tree content is unchanged', async () => {
    const before = await sourceState();
    git(['commit', '--amend', '--no-edit']);
    const after = await sourceState();

    expect(after.data.state!.sourceHash).toBe(before.data.state!.sourceHash);
    expect(after.data.state!.fileHashes).toEqual(before.data.state!.fileHashes);
  });

  it('ignores uncommitted working-tree content', async () => {
    const before = await sourceState();
    write('tracked', 'working tree only\n');
    const after = await sourceState();

    expect(after.data.state!.sourceHash).toBe(before.data.state!.sourceHash);
    expect(after.data.state!.fileHashes).toEqual(before.data.state!.fileHashes);
  });

  it('ignores mtime-only changes', async () => {
    const before = await sourceState();
    const filePath = resolveContainedPath(projectRoot, 'tracked');
    const future = new Date(Date.now() + 60_000);
    utimesSync(filePath, future, future);
    const after = await sourceState();

    expect(after.data.state!.sourceHash).toBe(before.data.state!.sourceHash);
  });

  it('uses a stable sentinel for committed deletions', async () => {
    rmSync(resolveContainedPath(projectRoot, 'tracked'));
    commit('delete tracked');

    const state = await sourceState();

    expect(state.data.state!.fileHashes.tracked).toBe(
      REVIEW_STATE_DELETED_FILE_HASH,
    );
  });

  it('includes committed tree mode in the source hash', async () => {
    const before = await sourceState();
    const filePath = resolveContainedPath(projectRoot, 'tracked');
    chmodSync(filePath, 0o755);
    commit('make executable');
    const after = await sourceState();

    expect(after.data.state!.fileHashes.tracked).toBe(
      before.data.state!.fileHashes.tracked,
    );
    expect(after.data.state!.sourceHash).not.toBe(
      before.data.state!.sourceHash,
    );
  });

  it.skipIf(controlCharacterPathsUnsupported)(
    'preserves newline-containing paths from NUL-delimited Git output',
    async () => {
      const relativePath = 'line\nbreak';
      write(relativePath, 'newline path\n');
      commit('newline path');

      const state = await sourceState();

      expect(state.data.state!.fileHashes[relativePath]).toMatch(
        /^[0-9a-f]{40,64}$/,
      );
    },
  );

  it.skipIf(controlCharacterPathsUnsupported)(
    'preserves tab-containing paths from NUL-delimited tree output',
    async () => {
      const relativePath = 'tab\tpath';
      write(relativePath, 'tab path\n');
      commit('tab path');

      const state = await sourceState();

      expect(state.data.state!.fileHashes[relativePath]).toMatch(
        /^[0-9a-f]{40,64}$/,
      );
    },
  );

  it('changes when the selected merge base changes', async () => {
    git(['branch', 'older-base', 'main~0']);
    git(['checkout', 'main']);
    write('base-only', 'later base\n');
    commit('advance main');
    git(['checkout', 'feature/hash']);
    git(['rebase', 'main']);

    const currentBase = await sourceState();
    const olderBase = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: 'feature/hash',
      baseRef: 'older-base',
      force: true,
    });

    expect(olderBase.data.state!.baseCommit).not.toBe(
      currentBase.data.state!.baseCommit,
    );
    expect(olderBase.data.state!.sourceHash).not.toBe(
      currentBase.data.state!.sourceHash,
    );
  });
});
