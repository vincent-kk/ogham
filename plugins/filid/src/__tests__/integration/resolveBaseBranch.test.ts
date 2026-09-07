/** Tests invoke the canonical CLI; Vitest owns the helpers' repository state. */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

/** Executable shipped beside the PR skill, independent of runtime bundles. */
const script = fileURLToPath(
  new URL(
    '../../../skills/pull-request/scripts/resolveBaseBranch.mjs',
    import.meta.url,
  ),
);

describe('resolveBaseBranch CLI Git graph regressions', () => {
  let repository: string;
  let gitArguments: string[];

  /** Run Git in the disposable repository without user hooks or signing.
   * @param args Git arguments, passed without a shell.
   * @returns Trimmed stdout; command failures propagate to the test.
   */
  function git(...args: string[]): string {
    return execFileSync('git', [...gitArguments, ...args], {
      cwd: repository,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  }

  /** Invoke the real CLI, preserving failure diagnostics for negative cases.
   * @param args Optional CLI arguments overriding automatic selection.
   * @returns Parsed selection JSON; a nonzero exit fails the invocation.
   */
  function resolve(...args: string[]) {
    return JSON.parse(
      execFileSync(
        process.execPath,
        [script, '--project-root', repository, ...args],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
      ),
    );
  }

  beforeEach(() => {
    repository = mkdtempSync(join(tmpdir(), 'filid base-'));
    gitArguments = [
      '-c',
      'user.name=Filid Test',
      '-c',
      'user.email=filid@example.invalid',
      '-c',
      'commit.gpgSign=false',
      '-c',
      `core.hooksPath=${repository}`,
    ];
    git('init', '--quiet', '-b', 'main');
    git('commit', '--quiet', '--allow-empty', '-m', 'root');
    git('update-ref', 'refs/remotes/origin/main', 'HEAD');
    git('symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/remotes/origin/main');
    git('checkout', '--quiet', '-b', 'parent');
    writeFileSync(join(repository, 'parent.txt'), 'parent\n');
    git('add', 'parent.txt');
    git('commit', '--quiet', '-m', 'parent change');
    git('checkout', '--quiet', '-b', 'topic');
    writeFileSync(join(repository, 'topic.txt'), 'topic\n');
    git('add', 'topic.txt');
    git('commit', '--quiet', '-m', 'topic change');
  });

  afterEach(() => rmSync(repository, { recursive: true, force: true }));

  it('selects the stacked parent and excludes its changes from file statistics', () => {
    const result = resolve();
    expect(result).toMatchObject({
      baseBranch: 'parent',
      baseRef: 'refs/heads/parent',
      ahead: 1,
      behind: 0,
      source: 'graph',
      ambiguous: false,
    });
    expect(result.mergeBase).toBe(git('rev-parse', 'parent'));
    expect(git('diff', '--name-only', `${result.baseRef}...HEAD`)).toBe(
      'topic.txt',
    );
    expect(git('diff', '--numstat', `${result.baseRef}...HEAD`)).toBe(
      '1\t0\ttopic.txt',
    );
    expect(git('log', '--format=%s', `${result.baseRef}..HEAD`)).toBe(
      'topic change',
    );
  });

  it('keeps an advancing parent and excludes its later changes', () => {
    git('checkout', '--quiet', 'parent');
    writeFileSync(join(repository, 'later.txt'), 'later\n');
    git('add', 'later.txt');
    git('commit', '--quiet', '-m', 'parent advances');
    git('checkout', '--quiet', 'topic');
    const result = resolve();
    expect(result).toMatchObject({ baseBranch: 'parent', ahead: 1, behind: 1 });
    expect(git('diff', '--name-only', `${result.baseRef}...HEAD`)).toBe(
      'topic.txt',
    );
  });

  it('finds a remote-only parent and normalizes its PR branch name', () => {
    git('update-ref', 'refs/remotes/origin/parent', 'parent');
    git('branch', '-D', 'parent');
    expect(resolve()).toMatchObject({
      baseBranch: 'parent',
      baseRef: 'refs/remotes/origin/parent',
    });
  });

  it('uses the remote snapshot when a local branch with the same name is stale', () => {
    git('update-ref', 'refs/remotes/origin/parent', 'parent');
    git('branch', '-f', 'parent', 'main');
    expect(resolve()).toMatchObject({
      baseBranch: 'parent',
      baseRef: 'refs/remotes/origin/parent',
      ahead: 1,
    });
  });

  it('excludes the current tracking branch, equal tips, descendants and unrelated roots', () => {
    git('update-ref', 'refs/remotes/origin/topic', 'HEAD~1');
    git('branch', 'alias', 'HEAD');
    git('checkout', '--quiet', '-b', 'child');
    git('commit', '--quiet', '--allow-empty', '-m', 'child');
    git('checkout', '--quiet', '--orphan', 'unrelated');
    git('commit', '--quiet', '-m', 'unrelated root');
    git('checkout', '--quiet', 'topic');
    expect(resolve()).toMatchObject({ baseBranch: 'parent', ambiguous: false });
  });

  it('prefers the default branch among equally near fork points and reports ambiguity', () => {
    git('branch', '-D', 'parent');
    git('branch', 'aaa-sibling', 'main');
    expect(resolve()).toMatchObject({
      baseBranch: 'main',
      ambiguous: true,
      tiedCandidates: ['aaa-sibling', 'main'],
    });
  });

  it('uses base-side distance and a stable name tie-breaker for ambiguous parents', () => {
    git('branch', 'aaa-parent', 'parent');
    git('checkout', '--quiet', 'parent');
    git('commit', '--quiet', '--allow-empty', '-m', 'advance');
    git('checkout', '--quiet', 'topic');
    expect(resolve()).toMatchObject({
      baseBranch: 'aaa-parent',
      ambiguous: true,
      tiedCandidates: ['aaa-parent', 'parent'],
    });
    git('branch', 'bbb-parent', 'aaa-parent');
    expect(resolve().baseBranch).toBe('aaa-parent');
  });

  it('honors an explicit base even when a nearer parent exists', () => {
    expect(resolve('--base', 'main')).toMatchObject({
      baseBranch: 'main',
      baseRef: 'refs/remotes/origin/main',
      ahead: 2,
      source: 'explicit',
      ambiguous: false,
      tiedCandidates: [],
    });
  });

  it('accepts explicit local and full remote branch refs without changing their target', () => {
    expect(resolve('--base', 'refs/heads/main').baseRef).toBe(
      'refs/heads/main',
    );
    expect(resolve('--base', 'refs/remotes/origin/main').baseBranch).toBe(
      'main',
    );
    expect(resolve('--base', 'origin/main').baseBranch).toBe('main');
  });

  it('rejects an invalid explicit base without falling back', () => {
    expect(() => resolve('--base', 'missing')).toThrow(
      /Could not resolve base branch/,
    );
    expect(() => resolve('--base', 'HEAD')).toThrow(
      /Could not resolve base branch/,
    );
    expect(() => resolve('--base', 'main;echo injected')).toThrow(
      /Could not resolve base branch/,
    );
  });

  it('rejects tags and commit IDs because a PR requires a branch', () => {
    git('tag', 'release', 'main');
    expect(() => resolve('--base', 'release')).toThrow(
      /Could not resolve base branch/,
    );
    expect(() => resolve('--base', git('rev-parse', 'main'))).toThrow(
      /Could not resolve base branch/,
    );
  });

  it('rejects detached HEAD and a branch with no commits ahead of the requested base', () => {
    expect(() => resolve('--base', 'topic')).toThrow(/no commits ahead/);
    git('checkout', '--quiet', '--detach');
    expect(() => resolve()).toThrow(/attached branch/);
  });

  it('refuses automatic inference for shallow history while explicit base skips it', () => {
    writeFileSync(
      join(repository, '.git', 'shallow'),
      `${git('rev-parse', 'main')}\n`,
    );
    expect(() => resolve()).toThrow(/shallow/);
    expect(resolve('--base', 'parent').source).toBe('explicit');
  });

  it('fails when all other refs contain HEAD instead of inventing a parent', () => {
    git('branch', '-D', 'parent');
    git('update-ref', 'refs/heads/main', 'HEAD');
    git('update-ref', 'refs/remotes/origin/main', 'HEAD');
    expect(() => resolve()).toThrow(/No eligible base branch/);
  });

  it('uses a configured remote default and supports repositories without remote refs', () => {
    git('branch', '-D', 'parent');
    git('update-ref', 'refs/remotes/origin/trunk', 'main');
    git(
      'symbolic-ref',
      'refs/remotes/origin/HEAD',
      'refs/remotes/origin/trunk',
    );
    expect(resolve().baseBranch).toBe('trunk');
    git('symbolic-ref', '--delete', 'refs/remotes/origin/HEAD');
    git('update-ref', '-d', 'refs/remotes/origin/trunk');
    git('update-ref', '-d', 'refs/remotes/origin/main');
    expect(resolve()).toMatchObject({
      baseBranch: 'main',
      baseRef: 'refs/heads/main',
    });
  });

  it('excludes criss-cross candidates and refuses an ambiguous explicit merge base', () => {
    const root = git('rev-parse', 'main');
    const left = git('rev-parse', 'parent');
    const tree = git('rev-parse', 'HEAD^{tree}');
    const right = git('commit-tree', tree, '-p', root, '-m', 'right');
    const leftMerge = git(
      'commit-tree',
      tree,
      '-p',
      left,
      '-p',
      right,
      '-m',
      'left merge',
    );
    const rightMerge = git(
      'commit-tree',
      tree,
      '-p',
      right,
      '-p',
      left,
      '-m',
      'right merge',
    );
    git('update-ref', 'refs/heads/topic', leftMerge);
    git('update-ref', 'refs/heads/parent', rightMerge);
    expect(
      git('merge-base', '--all', 'parent', 'topic').split('\n'),
    ).toHaveLength(2);
    expect(resolve().baseBranch).toBe('main');
    expect(() => resolve('--base', 'parent')).toThrow(/exactly one merge base/);
  });

  it('reports an unborn branch before trying to choose its parent', () => {
    git('checkout', '--quiet', '--orphan', 'unborn');
    expect(() => resolve()).toThrow(/current branch has no commits/);
  });
});
