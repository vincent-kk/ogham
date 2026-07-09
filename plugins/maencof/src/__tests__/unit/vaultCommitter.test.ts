/**
 * @file vaultCommitter.test.ts
 * @description vault-committer hook unit tests — auto-commit vault changes on SessionEnd
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { spawnCli } from '@ogham/cross-platform/spawn';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  isClearCommand,
  readVaultCommitConfig,
  runVaultCommitter,
  shouldCommitOnPrompt,
} from '../../hooks/utils/vaultCommitter/index.js';

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

  it('Y3: picks up skip_patterns string[] from config', () => {
    writeFileSync(
      join(vaultDir, '.maencof-meta', 'vault-commit.json'),
      JSON.stringify({
        enabled: true,
        skip_patterns: ['^/resetthing\\b', '^/wrap\\s*$'],
      }),
    );
    const config = readVaultCommitConfig(vaultDir);
    expect(config?.skip_patterns).toEqual(['^/resetthing\\b', '^/wrap\\s*$']);
  });

  it('Y3: drops non-string skip_patterns entries', () => {
    writeFileSync(
      join(vaultDir, '.maencof-meta', 'vault-commit.json'),
      JSON.stringify({
        enabled: true,
        skip_patterns: ['^/ok$', 42, null, '', '^/ok2$'],
      }),
    );
    const config = readVaultCommitConfig(vaultDir);
    expect(config?.skip_patterns).toEqual(['^/ok$', '^/ok2$']);
  });

  it('Y3: empty skip_patterns array falls back to default (absent field)', () => {
    writeFileSync(
      join(vaultDir, '.maencof-meta', 'vault-commit.json'),
      JSON.stringify({ enabled: true, skip_patterns: [] }),
    );
    const config = readVaultCommitConfig(vaultDir);
    expect(config?.skip_patterns).toBeUndefined();
  });

  it('picks up scope entries and drops unsafe ones item-by-item', () => {
    writeFileSync(
      join(vaultDir, '.maencof-meta', 'vault-commit.json'),
      JSON.stringify({
        enabled: true,
        scope: ['01_Core/', '/abs', '../up', 'a:b', '.git/hooks', 42, 'valid/'],
      }),
    );
    const config = readVaultCommitConfig(vaultDir);
    expect(config?.scope).toEqual(['01_Core/', 'valid/']);
  });

  it('picks up message_template with a sufficiently long static prefix', () => {
    writeFileSync(
      join(vaultDir, '.maencof-meta', 'vault-commit.json'),
      JSON.stringify({
        enabled: true,
        message_template: 'vault: wrap [{dirs}] ({date})',
      }),
    );
    expect(readVaultCommitConfig(vaultDir)?.message_template).toBe(
      'vault: wrap [{dirs}] ({date})',
    );
  });

  it('drops message_template whose static prefix is too short to be a safe fold marker', () => {
    writeFileSync(
      join(vaultDir, '.maencof-meta', 'vault-commit.json'),
      JSON.stringify({ enabled: true, message_template: 'up: {dirs}' }),
    );
    expect(readVaultCommitConfig(vaultDir)?.message_template).toBeUndefined();
  });

  it('picks up fold_daily boolean and ignores non-boolean values', () => {
    writeFileSync(
      join(vaultDir, '.maencof-meta', 'vault-commit.json'),
      JSON.stringify({ enabled: true, fold_daily: false }),
    );
    expect(readVaultCommitConfig(vaultDir)?.fold_daily).toBe(false);

    writeFileSync(
      join(vaultDir, '.maencof-meta', 'vault-commit.json'),
      JSON.stringify({ enabled: true, fold_daily: 'yes' }),
    );
    expect(readVaultCommitConfig(vaultDir)?.fold_daily).toBeUndefined();
  });
});

describe('shouldCommitOnPrompt (Y3)', () => {
  it('기본 config(skip_patterns 없음) 에서는 /clear 만 매칭한다', () => {
    expect(shouldCommitOnPrompt('/clear', null)).toBe(true);
    expect(shouldCommitOnPrompt('/clear ', null)).toBe(true);
    expect(shouldCommitOnPrompt('  /clear  ', null)).toBe(true);
    expect(shouldCommitOnPrompt('/CLEAR', null)).toBe(true);
    expect(shouldCommitOnPrompt('fix the bug', null)).toBe(false);
    expect(shouldCommitOnPrompt('/clear something', null)).toBe(false);
  });

  it('사용자 custom skip_patterns 로 /resetthing 을 등록하면 매칭한다', () => {
    const config = {
      enabled: true,
      skip_patterns: ['^\\s*/resetthing\\s*$'],
    };
    expect(shouldCommitOnPrompt('/resetthing', config)).toBe(true);
    expect(shouldCommitOnPrompt('/clear', config)).toBe(false);
  });

  it('malformed regex 는 조용히 skip 되고 나머지 패턴만 사용한다', () => {
    const config = {
      enabled: true,
      skip_patterns: ['[invalid', '^/wrap\\s*$'],
    };
    expect(shouldCommitOnPrompt('/wrap', config)).toBe(true);
    expect(shouldCommitOnPrompt('[invalid', config)).toBe(false);
  });
});

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

  it('returns { continue: true } when .git/index.lock exists', async () => {
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

  it('commits on SessionEnd without needing prompt field', async () => {
    enableVaultCommit(vaultDir);
    setupGitMocks(vaultDir, { hasChanges: true });
    const result = await runVaultCommitter({ cwd: vaultDir }, 'SessionEnd');
    expect(result).toEqual({ continue: true });
    expect(
      findCalls((bin, args) => bin === 'git' && args[0] === 'commit'),
    ).toHaveLength(1);
  });

  it('commits when event is undefined (backward compat, defaults to SessionEnd behavior)', async () => {
    enableVaultCommit(vaultDir);
    setupGitMocks(vaultDir, { hasChanges: true });
    const result = await runVaultCommitter({ cwd: vaultDir });
    expect(result).toEqual({ continue: true });
    expect(
      findCalls((bin, args) => bin === 'git' && args[0] === 'commit'),
    ).toHaveLength(1);
  });
});
