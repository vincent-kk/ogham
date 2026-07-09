/**
 * @file gitUtils.test.ts
 * @description gitUtils unit tests — scoped staging, sensitive excludes, lock retry, commit message
 */
import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { spawnCli } from '@ogham/cross-platform/spawn';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GIT_LOCK_RETRY_DELAYS_MS } from '../../constants/performance.js';
import { SENSITIVE_EXCLUDE_PATH_SPECS } from '../../constants/vaultCommitter.js';
import {
  generateCommitMessage,
  runGit,
  stageVaultChanges,
  stagedTopLevels,
} from '../../hooks/utils/gitUtils/index.js';

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

const lockedResult = () => ({
  code: 128,
  stdout: '',
  stderr:
    "fatal: Unable to create '/vault/.git/index.lock': File exists.\n\nAnother git process seems to be running",
  timedOut: false,
  spawnError: undefined,
});

describe('runGit — index.lock retry', () => {
  beforeEach(() => {
    mockSpawnCli.mockReset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retries after a lock failure and returns the eventual success', async () => {
    mockSpawnCli
      .mockResolvedValueOnce(lockedResult())
      .mockResolvedValueOnce(okResult('done\n'));
    const promise = runGit('/vault', ['add', '--', '01_Core/']);
    await vi.advanceTimersByTimeAsync(GIT_LOCK_RETRY_DELAYS_MS[0]);
    const result = await promise;
    expect(result.code).toBe(0);
    expect(mockSpawnCli).toHaveBeenCalledTimes(2);
  });

  it('gives up after exhausting the retry delays', async () => {
    mockSpawnCli.mockResolvedValue(lockedResult());
    const totalDelay = GIT_LOCK_RETRY_DELAYS_MS.reduce((a, b) => a + b, 0);
    const promise = runGit('/vault', ['commit']);
    await vi.advanceTimersByTimeAsync(totalDelay);
    const result = await promise;
    expect(result.code).toBe(128);
    expect(mockSpawnCli).toHaveBeenCalledTimes(
      1 + GIT_LOCK_RETRY_DELAYS_MS.length,
    );
  });

  it('does not retry non-lock failures', async () => {
    mockSpawnCli.mockResolvedValue({
      ...okResult(),
      code: 1,
      stderr: 'fatal: not a git repository',
    });
    const result = await runGit('/vault', ['status']);
    expect(result.code).toBe(1);
    expect(mockSpawnCli).toHaveBeenCalledTimes(1);
  });
});

describe('stageVaultChanges', () => {
  let vaultDir: string;

  beforeEach(() => {
    mockSpawnCli.mockReset();
    mockSpawnCli.mockResolvedValue(okResult());
    vaultDir = join(
      tmpdir(),
      `maencof-git-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    );
    mkdirSync(join(vaultDir, '01_Core'), { recursive: true });
    mkdirSync(join(vaultDir, '.maencof-meta'), { recursive: true });
  });

  afterEach(() => {
    rmSync(vaultDir, { recursive: true, force: true, maxRetries: 3 });
  });

  it('stages only scope entries that exist, with sensitive excludes appended', async () => {
    await stageVaultChanges(vaultDir, [
      '01_Core/',
      '02_Derived/',
      '.maencof-meta/',
    ]);
    expect(mockSpawnCli).toHaveBeenCalledTimes(1);
    const args = mockSpawnCli.mock.calls[0][1] as string[];
    expect(args).toEqual([
      'add',
      '--',
      '01_Core/',
      '.maencof-meta/',
      ...SENSITIVE_EXCLUDE_PATH_SPECS,
    ]);
  });

  it('skips git entirely when no scope entry exists on disk', async () => {
    await stageVaultChanges(vaultDir, ['02_Derived/', '05_Context/']);
    expect(mockSpawnCli).not.toHaveBeenCalled();
  });

  it('supports whole-vault scope "." with exclusions delegated to gitignore', async () => {
    await stageVaultChanges(vaultDir, ['.']);
    expect(mockSpawnCli).toHaveBeenCalledTimes(1);
    const args = mockSpawnCli.mock.calls[0][1] as string[];
    expect(args).toEqual(['add', '--', '.', ...SENSITIVE_EXCLUDE_PATH_SPECS]);
  });

  it('throws when git add fails', async () => {
    mockSpawnCli.mockResolvedValue({
      ...okResult(),
      code: 1,
      stderr: 'fatal: pathspec error',
    });
    await expect(stageVaultChanges(vaultDir, ['01_Core/'])).rejects.toThrow(
      /git add failed/,
    );
  });
});

describe('stagedTopLevels', () => {
  it('deduplicates and orders top-level directories by scope position', () => {
    const staged = [
      '.maencof-meta/activity/sessions/2026-07-08.json',
      '04_Action/task.md',
      '01_Core/identity.md',
      '01_Core/values.md',
    ];
    const scope = ['01_Core/', '04_Action/', '.maencof-meta/'];
    expect(stagedTopLevels(staged, scope)).toEqual([
      '01_Core',
      '04_Action',
      '.maencof-meta',
    ]);
  });

  it('sorts entries outside the scope last, alphabetically', () => {
    const staged = ['zeta/x.md', 'alpha/y.md', '01_Core/z.md'];
    expect(stagedTopLevels(staged, ['01_Core/'])).toEqual([
      '01_Core',
      'alpha',
      'zeta',
    ]);
  });
});

describe('generateCommitMessage', () => {
  it('renders the default session wrap format with directory list and timestamp', () => {
    const message = generateCommitMessage(['01_Core', '.maencof-meta'], 3);
    expect(message).toMatch(
      /^chore\(maencof\): session wrap \[01_Core, \.maencof-meta\] \(\d{4}-\d{2}-\d{2} \d{2}:\d{2}\)$/,
    );
  });

  it('renders custom templates, substituting known placeholders and passing unknown ones through', () => {
    const message = generateCommitMessage(
      ['01_Core', 'dashboard'],
      7,
      'vault: wrap {count} files in {dirs} ({date} {time}) {nope}',
    );
    expect(message).toMatch(
      /^vault: wrap 7 files in 01_Core, dashboard \(\d{4}-\d{2}-\d{2} \d{2}:\d{2}\) \{nope\}$/,
    );
  });
});
