import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { findGitDir } from '../findGitDir.js';

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'filid-gitdir-'));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('findGitDir', () => {
  it('resolves a plain .git directory (gitDir == commonDir)', () => {
    mkdirSync(join(root, '.git'));
    expect(findGitDir(root)).toEqual({
      gitDir: join(root, '.git'),
      commonDir: join(root, '.git'),
    });
  });

  it('walks up from a subdirectory to the repo root', () => {
    mkdirSync(join(root, '.git'));
    const nested = join(root, 'src', 'deep');
    mkdirSync(nested, { recursive: true });
    expect(findGitDir(nested)?.gitDir).toBe(join(root, '.git'));
  });

  it('dereferences a .git file (linked worktree) and its commondir', () => {
    const mainGit = join(root, 'main', '.git');
    const wtGitDir = join(mainGit, 'worktrees', 'wt1');
    mkdirSync(wtGitDir, { recursive: true });
    writeFileSync(join(wtGitDir, 'commondir'), '../..\n');

    const worktree = join(root, 'wt1');
    mkdirSync(worktree);
    writeFileSync(join(worktree, '.git'), `gitdir: ${wtGitDir}\n`);

    expect(findGitDir(worktree)).toEqual({
      gitDir: wtGitDir,
      commonDir: mainGit,
    });
  });

  it('returns null when no .git exists up the tree', () => {
    expect(findGitDir(root)).toBeNull();
  });
});
