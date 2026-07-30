/**
 * @file vaultCommitterRun.test.ts
 * @description vault-committer 커밋 실행 유닛 테스트 — BootSweep / UserPromptSubmit 경로
 */
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { spawnCli } from '@ogham/cross-platform/spawn';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { runVaultCommitter } from '../../hooks/utils/vaultCommitter/index.js';

// ── Mock @ogham/cross-platform/spawn ─────────────────────────────────
//
// PR-D moved git execSync/execFileSync to spawnCli from @ogham/cross-platform.
// Tests mock the spawnCli sub-export directly; arguments are normalized to
// `(bin, args, opts)` so legacy execSync command-string parsing is gone.

vi.mock('@ogham/cross-platform/spawn', () => ({
  spawnCli: vi.fn(),
}));

const mockSpawnCli = vi.mocked(spawnCli);

const okResult = (stdout = '') => ({
  code: 0,
  stdout,
  stderr: '',
  timedOut: false,
  spawnError: undefined,
});

const errResult = (stderr = 'fail') => ({
  code: 1,
  stdout: '',
  stderr,
  timedOut: false,
  spawnError: undefined,
});

// ── Helpers ──────────────────────────────────────────────────────────

function createTempVault(): string {
  const dir = join(
    tmpdir(),
    `maencof-vc-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  );
  mkdirSync(dir, { recursive: true });
  mkdirSync(join(dir, '.maencof'), { recursive: true });
  mkdirSync(join(dir, '.maencof-meta'), { recursive: true });
  mkdirSync(join(dir, '01_Core'), { recursive: true });
  return dir;
}

function enableVaultCommit(cwd: string): void {
  writeFileSync(
    join(cwd, '.maencof-meta', 'vault-commit.json'),
    JSON.stringify({ enabled: true }),
  );
}

/**
 * Configure mockSpawnCli to simulate a git repo with vault changes.
 * Matches by (bin, args) — no command-string parsing.
 */
function setupGitMocks(
  cwd: string,
  opts?: {
    hasChanges?: boolean;
    commitThrows?: boolean;
  },
): void {
  const { hasChanges = true, commitThrows = false } = opts ?? {};

  mockSpawnCli.mockImplementation(
    async (bin: string, args: readonly string[]) => {
      if (bin !== 'git') return okResult();
      if (args.includes('--is-inside-work-tree')) return okResult('true\n');
      if (args.includes('--show-toplevel')) return okResult(`${cwd}\n`);
      if (args[0] === 'status')
        return okResult(hasChanges ? ' M 01_Core/identity.md\n' : '');
      if (args[0] === 'diff')
        return okResult(hasChanges ? '01_Core/identity.md\n' : '');

      if (args[0] === 'commit' && commitThrows)
        return errResult('commit failed');
      // rev-parse HEAD falls through to okResult('') → unborn HEAD → fold skipped
      return okResult();
    },
  );
}

function findCalls(
  predicate: (bin: string, args: readonly string[]) => boolean,
) {
  return mockSpawnCli.mock.calls.filter((call) => {
    const [bin, args] = call as [string, readonly string[]];
    return predicate(bin, args);
  });
}

// ── Tests ────────────────────────────────────────────────────────────

describe('runVaultCommitter', () => {
  let vaultDir: string;

  beforeEach(() => {
    vaultDir = createTempVault();
    mockSpawnCli.mockReset();
  });

  afterEach(() => {
    rmSync(vaultDir, { recursive: true, force: true, maxRetries: 3 });
  });

  it('returns { continue: true } when not a maencof vault', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'non-vault-'));
    try {
      const result = await runVaultCommitter({ cwd: tmpDir });
      expect(result).toEqual({ continue: true });
      expect(mockSpawnCli).not.toHaveBeenCalled();
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('returns { continue: true } when config file is missing', async () => {
    const result = await runVaultCommitter({ cwd: vaultDir });
    expect(result).toEqual({ continue: true });
    expect(mockSpawnCli).not.toHaveBeenCalled();
  });

  it('returns { continue: true } when config has enabled: false', async () => {
    writeFileSync(
      join(vaultDir, '.maencof-meta', 'vault-commit.json'),
      JSON.stringify({ enabled: false }),
    );
    const result = await runVaultCommitter({ cwd: vaultDir });
    expect(result).toEqual({ continue: true });
    expect(mockSpawnCli).not.toHaveBeenCalled();
  });

  it('returns { continue: true } when not in a git repo', async () => {
    enableVaultCommit(vaultDir);
    mockSpawnCli.mockResolvedValue(errResult('not a git repository'));
    const result = await runVaultCommitter({ cwd: vaultDir });
    expect(result).toEqual({ continue: true });
  });

  it('returns { continue: true } when a live .git/index.lock exists', async () => {
    enableVaultCommit(vaultDir);
    const gitDir = join(vaultDir, '.git');
    mkdirSync(gitDir, { recursive: true });
    writeFileSync(join(gitDir, 'index.lock'), '');

    mockSpawnCli.mockImplementation(
      async (bin: string, args: readonly string[]) => {
        if (bin !== 'git') return okResult();
        if (args.includes('--is-inside-work-tree')) return okResult('true\n');
        if (args.includes('--show-toplevel')) return okResult(`${vaultDir}\n`);
        return okResult();
      },
    );

    const result = await runVaultCommitter({ cwd: vaultDir });
    expect(result).toEqual({ continue: true });
    // Should not have called git status (stopped at index.lock check)
    const statusCalls = findCalls(
      (bin, args) => bin === 'git' && args[0] === 'status',
    );
    expect(statusCalls).toHaveLength(0);
    // A live (fresh) lock is respected, never deleted
    expect(existsSync(join(gitDir, 'index.lock'))).toBe(true);
  });

  it('reclaims a stale .git/index.lock and proceeds past the gate', async () => {
    enableVaultCommit(vaultDir);
    const gitDir = join(vaultDir, '.git');
    mkdirSync(gitDir, { recursive: true });
    const lockPath = join(gitDir, 'index.lock');
    writeFileSync(lockPath, '');
    const past = new Date(Date.now() - 31 * 60_000);
    utimesSync(lockPath, past, past);

    setupGitMocks(vaultDir, { hasChanges: false });

    const result = await runVaultCommitter({ cwd: vaultDir });
    expect(result).toEqual({ continue: true });
    expect(existsSync(lockPath)).toBe(false);
    // Gate passed: the scoped change check (git status) ran after the reclaim
    const statusCalls = findCalls(
      (bin, args) => bin === 'git' && args[0] === 'status',
    );
    expect(statusCalls.length).toBeGreaterThan(0);
  });

  it('returns { continue: true } when no vault changes exist', async () => {
    enableVaultCommit(vaultDir);
    setupGitMocks(vaultDir, { hasChanges: false });
    const result = await runVaultCommitter({ cwd: vaultDir });
    expect(result).toEqual({ continue: true });
    // Should not have called git add or commit
    expect(
      findCalls((bin, args) => bin === 'git' && args[0] === 'add'),
    ).toHaveLength(0);
    expect(
      findCalls((bin, args) => bin === 'git' && args[0] === 'commit'),
    ).toHaveLength(0);
  });

  it('executes git add + commit when all conditions are met', async () => {
    enableVaultCommit(vaultDir);
    setupGitMocks(vaultDir, { hasChanges: true });
    const result = await runVaultCommitter({ cwd: vaultDir });
    expect(result).toEqual({ continue: true });

    const addCalls = findCalls(
      (bin, args) => bin === 'git' && args[0] === 'add',
    );
    expect(addCalls).toHaveLength(1);
    const addArgs = addCalls[0][1] as string[];
    expect(addArgs.slice(0, 2)).toEqual(['add', '--']);
    // only scope entries that exist on disk are staged (01_Core + .maencof-meta)
    expect(addArgs).toContain('01_Core/');
    expect(addArgs).toContain('.maencof-meta/');
    expect(addArgs).not.toContain('.maencof/');
    expect(addArgs).not.toContain('02_Derived/');
    expect(addArgs.some((arg) => arg.startsWith(':(exclude'))).toBe(true);

    const commitCalls = findCalls(
      (bin, args) => bin === 'git' && args[0] === 'commit',
    );
    expect(commitCalls).toHaveLength(1);
    const commitArgs = commitCalls[0][1] as string[];
    expect(commitArgs[0]).toBe('commit');
    expect(commitArgs[1]).toBe('--no-verify');
    expect(commitArgs[2]).toBe('-m');
    expect(commitArgs[3]).toMatch(
      /^chore\(maencof\): session wrap \[01_Core\] \(\d{4}-\d{2}-\d{2} \d{2}:\d{2}\)$/,
    );
  });

  it('returns { continue: true } when git commit fails', async () => {
    enableVaultCommit(vaultDir);
    setupGitMocks(vaultDir, { hasChanges: true, commitThrows: true });
    const result = await runVaultCommitter({ cwd: vaultDir });
    expect(result).toEqual({ continue: true });
  });

  it('passes timeoutMs: 1500 to all spawnCli calls', async () => {
    enableVaultCommit(vaultDir);
    setupGitMocks(vaultDir, { hasChanges: true });
    await runVaultCommitter({ cwd: vaultDir });

    for (const call of mockSpawnCli.mock.calls) {
      const opts = call[2] as { timeoutMs?: number } | undefined;
      expect(opts).toBeDefined();
      expect(opts!.timeoutMs).toBe(1500);
    }
  });
});

describe('runVaultCommitter with UserPromptSubmit event', () => {
  let vaultDir: string;

  beforeEach(() => {
    vaultDir = createTempVault();
    mockSpawnCli.mockReset();
  });

  afterEach(() => {
    rmSync(vaultDir, { recursive: true, force: true, maxRetries: 3 });
  });

  it('skips when UserPromptSubmit prompt is not /clear', async () => {
    enableVaultCommit(vaultDir);
    setupGitMocks(vaultDir, { hasChanges: true });
    const result = await runVaultCommitter(
      { cwd: vaultDir, prompt: 'fix the bug' },
      'UserPromptSubmit',
    );
    expect(result).toEqual({ continue: true });
    expect(mockSpawnCli).not.toHaveBeenCalled();
  });

  it('skips when UserPromptSubmit prompt is missing', async () => {
    enableVaultCommit(vaultDir);
    setupGitMocks(vaultDir, { hasChanges: true });
    const result = await runVaultCommitter(
      { cwd: vaultDir },
      'UserPromptSubmit',
    );
    expect(result).toEqual({ continue: true });
    expect(mockSpawnCli).not.toHaveBeenCalled();
  });

  it('commits when UserPromptSubmit prompt is /clear', async () => {
    enableVaultCommit(vaultDir);
    setupGitMocks(vaultDir, { hasChanges: true });
    const result = await runVaultCommitter(
      { cwd: vaultDir, prompt: '/clear' },
      'UserPromptSubmit',
    );
    expect(result).toEqual({ continue: true });
    expect(
      findCalls((bin, args) => bin === 'git' && args[0] === 'commit'),
    ).toHaveLength(1);
  });

  it('commits on BootSweep without needing prompt field', async () => {
    enableVaultCommit(vaultDir);
    setupGitMocks(vaultDir, { hasChanges: true });
    const result = await runVaultCommitter({ cwd: vaultDir }, 'BootSweep');
    expect(result).toEqual({ continue: true });
    expect(
      findCalls((bin, args) => bin === 'git' && args[0] === 'commit'),
    ).toHaveLength(1);
  });

  it('commits when event is undefined (backward compat, non-prompt behavior)', async () => {
    enableVaultCommit(vaultDir);
    setupGitMocks(vaultDir, { hasChanges: true });
    const result = await runVaultCommitter({ cwd: vaultDir });
    expect(result).toEqual({ continue: true });
    expect(
      findCalls((bin, args) => bin === 'git' && args[0] === 'commit'),
    ).toHaveLength(1);
  });
});
