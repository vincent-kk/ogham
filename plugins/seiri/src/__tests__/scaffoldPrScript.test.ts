import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

import { portableDirname, portableJoin } from '@ogham/cross-platform';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * Contract of the scaffold-pr skill script. The deterministic block:
 * argument validation precedes any repository probe, the repository probe
 * precedes any gh dependency, and stdout is exactly one parseable JSON
 * line either way — real gh presence and auth state vary by machine, so
 * they stay out of this suite. The mutate path is exercised end-to-end
 * against a local bare origin with a PATH-shimmed gh (POSIX shim, so the
 * e2e block is skipped on win32).
 */
const packageRoot = portableJoin(
  portableDirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);
const scriptPath = portableJoin(
  packageRoot,
  'skills',
  'scaffold-pr',
  'scripts',
  'scaffold-pr.mjs',
);

/**
 * Run the script under the test's own Node binary and return its exit
 * status with the parsed final stdout line.
 *
 * @param args CLI arguments handed to the script verbatim.
 * @param cwd Working directory for the child process.
 * @returns Exit status (-1 when the process could not start) and the last
 *   stdout line parsed as JSON (null when empty or unparseable).
 */
function runScript(
  args: string[],
  cwd: string,
): { status: number; result: Record<string, unknown> | null } {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    GIT_CEILING_DIRECTORIES: tmpdir(),
  };
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;
  const child = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd,
    env,
    encoding: 'utf8',
    windowsHide: true,
  });
  const lastLine = (child.stdout ?? '').trim().split('\n').at(-1) ?? '';
  let result: Record<string, unknown> | null = null;
  try {
    result = JSON.parse(lastLine) as Record<string, unknown>;
  } catch {
    result = null;
  }
  return { status: child.status ?? -1, result };
}

describe('scaffold-pr script', () => {
  let outsideRepo: string;

  beforeAll(() => {
    outsideRepo = mkdtempSync(portableJoin(tmpdir(), 'seiri-scaffold-'));
  });

  afterAll(() => {
    rmSync(outsideRepo, { recursive: true, force: true });
  });

  it('rejects a mutate call without --branch and --title as USAGE', () => {
    const { status, result } = runScript([], outsideRepo);
    expect(status).toBe(1);
    expect(result).toMatchObject({ ok: false, code: 'USAGE' });
  });

  it('reports NOT_A_REPO from --check outside any repository', () => {
    const { status, result } = runScript(['--check'], outsideRepo);
    expect(status).toBe(1);
    expect(result).toMatchObject({ ok: false, code: 'NOT_A_REPO' });
  });

  it('accepts --title-file and proceeds past argument validation', () => {
    const titlePath = portableJoin(outsideRepo, 'title.txt');
    writeFileSync(titlePath, 'A title from a file\n');
    const { status, result } = runScript(
      ['--branch', 'feature/x', '--title-file', titlePath],
      outsideRepo,
    );
    expect(status).toBe(1);
    expect(result).toMatchObject({ ok: false, code: 'NOT_A_REPO' });
  });

  it('rejects --title together with --title-file as USAGE', () => {
    const titlePath = portableJoin(outsideRepo, 'title.txt');
    writeFileSync(titlePath, 'A title from a file\n');
    const { status, result } = runScript(
      ['--branch', 'feature/x', '--title', 'inline', '--title-file', titlePath],
      outsideRepo,
    );
    expect(status).toBe(1);
    expect(result).toMatchObject({ ok: false, code: 'USAGE' });
  });

  it('rejects a missing --title-file as USAGE', () => {
    const { status, result } = runScript(
      [
        '--branch',
        'feature/x',
        '--title-file',
        portableJoin(outsideRepo, 'missing.txt'),
      ],
      outsideRepo,
    );
    expect(status).toBe(1);
    expect(result).toMatchObject({ ok: false, code: 'USAGE' });
  });
});

/**
 * POSIX-only shim standing in for gh: authenticated, no existing PR, and a
 * fixed URL from `pr create`. Lets the mutate sequence run without network
 * or credentials.
 */
const GH_SHIM = [
  '#!/bin/sh',
  'case "$1 $2" in',
  '  "auth status") exit 0 ;;',
  '  "pr list") printf \'[]\\n\' ;;',
  '  "pr create") printf \'https://example.test/pr/1\\n\' ;;',
  '  "repo view") printf \'{"defaultBranchRef":{"name":"main"}}\\n\' ;;',
  '  *) exit 1 ;;',
  'esac',
  '',
].join('\n');

/**
 * Run git in the e2e fixture, throwing on failure so a broken setup names
 * the failing step instead of surfacing as an unrelated assertion.
 *
 * @param cwd Repository directory to run in.
 * @param args git arguments.
 * @returns Captured stdout.
 */
function git(cwd: string, args: string[]): string {
  const r = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    windowsHide: true,
  });
  if (r.status !== 0)
    throw new Error(`git ${args.join(' ')} failed: ${r.stderr}`);
  return r.stdout;
}

describe.skipIf(process.platform === 'win32')(
  'scaffold-pr script — mutate e2e (POSIX gh shim; skipped on win32)',
  () => {
    let e2eRoot: string;
    let bareDir: string;
    let cloneDir: string;
    let shimDir: string;
    let titlePath: string;
    let messagePath: string;

    beforeAll(() => {
      e2eRoot = mkdtempSync(portableJoin(tmpdir(), 'seiri-scaffold-e2e-'));
      bareDir = portableJoin(e2eRoot, 'origin.git');
      cloneDir = portableJoin(e2eRoot, 'clone');
      shimDir = portableJoin(e2eRoot, 'bin');
      titlePath = portableJoin(e2eRoot, 'title.txt');
      messagePath = portableJoin(e2eRoot, 'message.txt');
      mkdirSync(shimDir);
      git(e2eRoot, [
        'init',
        '--bare',
        '--initial-branch',
        'main',
        'origin.git',
      ]);
      git(e2eRoot, ['clone', 'origin.git', 'clone']);
      git(cloneDir, ['config', 'user.email', 'scaffold@test.local']);
      git(cloneDir, ['config', 'user.name', 'Scaffold Test']);
      git(cloneDir, ['checkout', '-B', 'main']);
      git(cloneDir, ['commit', '--allow-empty', '-m', 'init']);
      git(cloneDir, ['push', '-u', 'origin', 'main']);
      writeFileSync(portableJoin(shimDir, 'gh'), GH_SHIM, { mode: 0o755 });
      writeFileSync(titlePath, 'Scaffold e2e title\n');
      writeFileSync(
        messagePath,
        'chore: scaffold PR for T-1\n\nRef: https://example.test/T-1\n',
      );
    });

    afterAll(() => {
      rmSync(e2eRoot, { recursive: true, force: true });
    });

    it('runs the full mutate sequence against a local bare origin', () => {
      const env: NodeJS.ProcessEnv = {
        ...process.env,
        PATH: `${shimDir}:${process.env.PATH ?? ''}`,
      };
      const child = spawnSync(
        process.execPath,
        [
          scriptPath,
          '--branch',
          'feature/T-1',
          '--title-file',
          titlePath,
          '--message-file',
          messagePath,
          '--base',
          'main',
        ],
        { cwd: cloneDir, env, encoding: 'utf8', windowsHide: true },
      );
      const lastLine = (child.stdout ?? '').trim().split('\n').at(-1) ?? '';
      expect(child.status).toBe(0);
      const result = JSON.parse(lastLine) as Record<string, unknown>;
      expect(result).toMatchObject({
        ok: true,
        url: 'https://example.test/pr/1',
        branch: 'feature/T-1',
        base: 'main',
        existing: false,
      });
      const pushed = spawnSync(
        'git',
        ['rev-parse', '--verify', 'refs/heads/feature/T-1'],
        { cwd: bareDir, encoding: 'utf8', windowsHide: true },
      );
      expect(pushed.status).toBe(0);
      const message = git(cloneDir, ['log', '-1', '--format=%B']);
      expect(message).toContain('chore: scaffold PR for T-1');
      expect(message).toContain('Ref: https://example.test/T-1');
    });
  },
);
