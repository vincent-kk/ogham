/**
 * @file vault-committer.test.ts
 * @description vault-committer hook unit tests — auto-commit vault changes on SessionEnd
 */
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  isClearCommand,
  readVaultCommitConfig,
  runVaultCommitter,
} from '../../hooks/vault-committer.js';
import { generateCommitMessage } from '../../hooks/git-utils.js';

// ── Mock child_process ───────────────────────────────────────────────

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
  execFileSync: vi.fn(),
}));

import { execFileSync, execSync } from 'node:child_process';

const mockExecSync = vi.mocked(execSync);
const mockExecFileSync = vi.mocked(execFileSync);

// ── Helpers ──────────────────────────────────────────────────────────

function createTempVault(): string {
  const dir = join(tmpdir(), `maencof-vc-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  mkdirSync(dir, { recursive: true });
  mkdirSync(join(dir, '.maencof'), { recursive: true });
  mkdirSync(join(dir, '.maencof-meta'), { recursive: true });
  return dir;
}

function enableVaultCommit(cwd: string): void {
  writeFileSync(
    join(cwd, '.maencof-meta', 'vault-commit.json'),
    JSON.stringify({ enabled: true }),
  );
}

/**
 * Configure mockExecSync to simulate a git repo with vault changes.
 * Each command is matched by prefix and returns the appropriate result.
 */
function setupGitMocks(
  cwd: string,
  opts?: {
    hasChanges?: boolean;
    commitThrows?: boolean;
  },
): void {
  const { hasChanges = true, commitThrows = false } = opts ?? {};

  mockExecSync.mockImplementation((cmd: string) => {
    const cmdStr = typeof cmd === 'string' ? cmd : String(cmd);
    if (cmdStr.includes('rev-parse --is-inside-work-tree')) {
      return Buffer.from('true\n');
    }
    if (cmdStr.includes('rev-parse --show-toplevel')) {
      return Buffer.from(`${cwd}\n`);
    }
    if (cmdStr.includes('status --porcelain')) {
      return Buffer.from(hasChanges ? ' M .maencof/graph.json\n' : '');
    }
    return Buffer.from('');
  });

  // execFileSync handles git add and git commit
  mockExecFileSync.mockImplementation(
    (cmd: string, args?: readonly string[]) => {
      if (
        commitThrows &&
        cmd === 'git' &&
        args?.includes('commit')
      ) {
        throw new Error('commit failed');
      }
      return Buffer.from('');
    },
  );
}

// ── Tests ────────────────────────────────────────────────────────────

describe('readVaultCommitConfig', () => {
  let vaultDir: string;

  beforeEach(() => {
    vaultDir = createTempVault();
  });

  afterEach(() => {
    rmSync(vaultDir, { recursive: true, force: true, maxRetries: 3 });
  });

  it('returns null when config file is missing', () => {
    expect(readVaultCommitConfig(vaultDir)).toBeNull();
  });

  it('returns config when file has enabled: true', () => {
    enableVaultCommit(vaultDir);
    const config = readVaultCommitConfig(vaultDir);
    expect(config).toEqual({ enabled: true });
  });

  it('returns config when file has enabled: false', () => {
    writeFileSync(
      join(vaultDir, '.maencof-meta', 'vault-commit.json'),
      JSON.stringify({ enabled: false }),
    );
    const config = readVaultCommitConfig(vaultDir);
    expect(config).toEqual({ enabled: false });
  });

  it('returns null for malformed JSON', () => {
    writeFileSync(
      join(vaultDir, '.maencof-meta', 'vault-commit.json'),
      '{invalid json',
    );
    expect(readVaultCommitConfig(vaultDir)).toBeNull();
  });

  it('returns null for JSON without enabled field', () => {
    writeFileSync(
      join(vaultDir, '.maencof-meta', 'vault-commit.json'),
      JSON.stringify({ active: true }),
    );
    expect(readVaultCommitConfig(vaultDir)).toBeNull();
  });
});

describe('runVaultCommitter', () => {
  let vaultDir: string;

  beforeEach(() => {
    vaultDir = createTempVault();
    mockExecSync.mockReset();
    mockExecFileSync.mockReset();
  });

  afterEach(() => {
    rmSync(vaultDir, { recursive: true, force: true, maxRetries: 3 });
  });

  it('returns { continue: true } when not a maencof vault', () => {
    const tmpDir = join(tmpdir(), `non-vault-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    try {
      const result = runVaultCommitter({ cwd: tmpDir });
      expect(result).toEqual({ continue: true });
      expect(mockExecSync).not.toHaveBeenCalled();
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('returns { continue: true } when config file is missing', () => {
    const result = runVaultCommitter({ cwd: vaultDir });
    expect(result).toEqual({ continue: true });
    expect(mockExecSync).not.toHaveBeenCalled();
  });

  it('returns { continue: true } when config has enabled: false', () => {
    writeFileSync(
      join(vaultDir, '.maencof-meta', 'vault-commit.json'),
      JSON.stringify({ enabled: false }),
    );
    const result = runVaultCommitter({ cwd: vaultDir });
    expect(result).toEqual({ continue: true });
    expect(mockExecSync).not.toHaveBeenCalled();
  });

  it('returns { continue: true } when not in a git repo', () => {
    enableVaultCommit(vaultDir);
    mockExecSync.mockImplementation(() => {
      throw new Error('not a git repository');
    });
    const result = runVaultCommitter({ cwd: vaultDir });
    expect(result).toEqual({ continue: true });
  });

  it('returns { continue: true } when .git/index.lock exists', () => {
    enableVaultCommit(vaultDir);
    // Create a fake .git directory with index.lock
    const gitDir = join(vaultDir, '.git');
    mkdirSync(gitDir, { recursive: true });
    writeFileSync(join(gitDir, 'index.lock'), '');

    mockExecSync.mockImplementation((cmd: string) => {
      const cmdStr = typeof cmd === 'string' ? cmd : String(cmd);
      if (cmdStr.includes('rev-parse --is-inside-work-tree')) {
        return Buffer.from('true\n');
      }
      if (cmdStr.includes('rev-parse --show-toplevel')) {
        return Buffer.from(`${vaultDir}\n`);
      }
      return Buffer.from('');
    });

    const result = runVaultCommitter({ cwd: vaultDir });
    expect(result).toEqual({ continue: true });
    // Should not have called git status (stopped at index.lock check)
    const statusCalls = mockExecSync.mock.calls.filter(
      (call) => typeof call[0] === 'string' && call[0].includes('status --porcelain'),
    );
    expect(statusCalls).toHaveLength(0);
  });

  it('returns { continue: true } when no vault changes exist', () => {
    enableVaultCommit(vaultDir);
    setupGitMocks(vaultDir, { hasChanges: false });
    const result = runVaultCommitter({ cwd: vaultDir });
    expect(result).toEqual({ continue: true });
    // Should not have called execFileSync (git add or git commit)
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });

  it('executes git add + commit when all conditions are met', () => {
    enableVaultCommit(vaultDir);
    setupGitMocks(vaultDir, { hasChanges: true });
    const result = runVaultCommitter({ cwd: vaultDir });
    expect(result).toEqual({ continue: true });

    // Verify git add was called separately for each directory
    const addCalls = mockExecFileSync.mock.calls.filter(
      (call) =>
        call[0] === 'git' &&
        Array.isArray(call[1]) &&
        (call[1] as string[]).includes('add'),
    );
    expect(addCalls).toHaveLength(2);
    expect(addCalls[0][1]).toEqual(['add', '.maencof/']);
    expect(addCalls[1][1]).toEqual(['add', '.maencof-meta/']);

    // Verify git commit was called with --no-verify and timestamped message
    const commitCalls = mockExecFileSync.mock.calls.filter(
      (call) =>
        call[0] === 'git' &&
        Array.isArray(call[1]) &&
        (call[1] as string[]).includes('commit'),
    );
    expect(commitCalls).toHaveLength(1);
    const commitArgs = commitCalls[0][1] as string[];
    expect(commitArgs[0]).toBe('commit');
    expect(commitArgs[1]).toBe('--no-verify');
    expect(commitArgs[2]).toBe('-m');
    expect(commitArgs[3]).toMatch(
      /^chore\(maencof\): \d{4}_\d{2}_\d{2}:\d{2}_\d{2}_\d{2}_session_wrap$/,
    );
  });

  it('returns { continue: true } when git commit fails', () => {
    enableVaultCommit(vaultDir);
    setupGitMocks(vaultDir, { hasChanges: true, commitThrows: true });
    const result = runVaultCommitter({ cwd: vaultDir });
    expect(result).toEqual({ continue: true });
  });

  it('passes timeout: 1500 and stdio: pipe to all exec calls', () => {
    enableVaultCommit(vaultDir);
    setupGitMocks(vaultDir, { hasChanges: true });
    runVaultCommitter({ cwd: vaultDir });

    // All execSync calls (read-only git operations) should have timeout: 1500
    for (const call of mockExecSync.mock.calls) {
      const opts = call[1] as { timeout?: number; stdio?: string } | undefined;
      expect(opts).toBeDefined();
      expect(opts!.timeout).toBe(1500);
      expect(opts!.stdio).toBe('pipe');
    }

    // All execFileSync calls (git add, git commit) should have timeout: 1500
    for (const call of mockExecFileSync.mock.calls) {
      const opts = call[2] as { timeout?: number; stdio?: string } | undefined;
      expect(opts).toBeDefined();
      expect(opts!.timeout).toBe(1500);
      expect(opts!.stdio).toBe('pipe');
    }
  });
});

describe('isClearCommand', () => {
  it('returns true for "/clear"', () => {
    expect(isClearCommand('/clear')).toBe(true);
  });

  it('returns true for "/clear" with trailing whitespace', () => {
    expect(isClearCommand('/clear  ')).toBe(true);
  });

  it('returns true for "/clear" with leading whitespace', () => {
    expect(isClearCommand('  /clear')).toBe(true);
  });

  it('returns true for "/CLEAR" (case insensitive)', () => {
    expect(isClearCommand('/CLEAR')).toBe(true);
  });

  it('returns false for "/clear something"', () => {
    expect(isClearCommand('/clear something')).toBe(false);
  });

  it('returns false for "please /clear"', () => {
    expect(isClearCommand('please /clear')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isClearCommand('')).toBe(false);
  });

  it('returns false for unrelated prompt', () => {
    expect(isClearCommand('fix the bug')).toBe(false);
  });
});

describe('runVaultCommitter with UserPromptSubmit event', () => {
  let vaultDir: string;

  beforeEach(() => {
    vaultDir = createTempVault();
    mockExecSync.mockReset();
    mockExecFileSync.mockReset();
  });

  afterEach(() => {
    rmSync(vaultDir, { recursive: true, force: true, maxRetries: 3 });
  });

  it('skips when UserPromptSubmit prompt is not /clear', () => {
    enableVaultCommit(vaultDir);
    setupGitMocks(vaultDir, { hasChanges: true });
    const result = runVaultCommitter(
      { cwd: vaultDir, prompt: 'fix the bug' },
      'UserPromptSubmit',
    );
    expect(result).toEqual({ continue: true });
    expect(mockExecSync).not.toHaveBeenCalled();
  });

  it('skips when UserPromptSubmit prompt is missing', () => {
    enableVaultCommit(vaultDir);
    setupGitMocks(vaultDir, { hasChanges: true });
    const result = runVaultCommitter(
      { cwd: vaultDir },
      'UserPromptSubmit',
    );
    expect(result).toEqual({ continue: true });
    expect(mockExecSync).not.toHaveBeenCalled();
  });

  it('commits when UserPromptSubmit prompt is /clear', () => {
    enableVaultCommit(vaultDir);
    setupGitMocks(vaultDir, { hasChanges: true });
    const result = runVaultCommitter(
      { cwd: vaultDir, prompt: '/clear' },
      'UserPromptSubmit',
    );
    expect(result).toEqual({ continue: true });
    // Should have called execFileSync for git add + commit
    expect(mockExecFileSync).toHaveBeenCalled();
  });

  it('commits on SessionEnd without needing prompt field', () => {
    enableVaultCommit(vaultDir);
    setupGitMocks(vaultDir, { hasChanges: true });
    const result = runVaultCommitter(
      { cwd: vaultDir },
      'SessionEnd',
    );
    expect(result).toEqual({ continue: true });
    expect(mockExecFileSync).toHaveBeenCalled();
  });

  it('commits when event is undefined (backward compat, defaults to SessionEnd behavior)', () => {
    enableVaultCommit(vaultDir);
    setupGitMocks(vaultDir, { hasChanges: true });
    const result = runVaultCommitter({ cwd: vaultDir });
    expect(result).toEqual({ continue: true });
    expect(mockExecFileSync).toHaveBeenCalled();
  });
});
