import { spawnCli } from '@ogham/cross-platform';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { executeReviewGit } from '../../../../mcp/tools/reviewState/hash/executeReviewGit.js';
import { runWithReviewGitCache } from '../../../../mcp/tools/reviewState/hash/runWithReviewGitCache.js';

vi.mock('@ogham/cross-platform', () => ({ spawnCli: vi.fn() }));

const ROOT = '/repo';

function resolveSpawn(stdout: string, code = 0): void {
  vi.mocked(spawnCli).mockResolvedValueOnce({
    stdout,
    stderr: code === 0 ? '' : 'boom',
    code,
    signal: null,
    timedOut: false,
    spawnError: undefined,
  } as unknown as Awaited<ReturnType<typeof spawnCli>>);
}

describe('executeReviewGit', () => {
  beforeEach(() => {
    vi.mocked(spawnCli).mockReset();
  });

  it('spawns every call outside a cache scope', async () => {
    resolveSpawn('a');
    resolveSpawn('b');
    expect(await executeReviewGit(ROOT, ['rev-parse', 'HEAD'])).toBe('a');
    expect(await executeReviewGit(ROOT, ['rev-parse', 'HEAD'])).toBe('b');
    expect(spawnCli).toHaveBeenCalledTimes(2);
  });

  it('answers an identical query once inside one action scope', async () => {
    resolveSpawn('sha');
    const outputs = await runWithReviewGitCache(() =>
      Promise.all([
        executeReviewGit(ROOT, ['rev-parse', 'HEAD']),
        executeReviewGit(ROOT, ['rev-parse', 'HEAD']),
        executeReviewGit(ROOT, ['rev-parse', 'HEAD']),
      ]),
    );
    expect(outputs).toEqual(['sha', 'sha', 'sha']);
    expect(spawnCli).toHaveBeenCalledTimes(1);
  });

  it('keys the cache on root and the full argument list', async () => {
    resolveSpawn('one');
    resolveSpawn('two');
    resolveSpawn('three');
    await runWithReviewGitCache(async () => {
      await executeReviewGit(ROOT, ['ls-tree', 'HEAD', '--', 'a.ts']);
      await executeReviewGit(ROOT, ['ls-tree', 'HEAD', '--', 'b.ts']);
      await executeReviewGit('/other', ['ls-tree', 'HEAD', '--', 'a.ts']);
      await executeReviewGit(ROOT, ['ls-tree', 'HEAD', '--', 'a.ts']);
    });
    expect(spawnCli).toHaveBeenCalledTimes(3);
  });

  it('keys the cache on standard input as well', async () => {
    resolveSpawn('first');
    resolveSpawn('second');
    await runWithReviewGitCache(async () => {
      await executeReviewGit(ROOT, ['cat-file', '--batch-check'], 'main\n');
      await executeReviewGit(ROOT, ['cat-file', '--batch-check'], 'master\n');
      await executeReviewGit(ROOT, ['cat-file', '--batch-check'], 'main\n');
    });
    expect(spawnCli).toHaveBeenCalledTimes(2);
    expect(spawnCli).toHaveBeenLastCalledWith(
      'git',
      ['cat-file', '--batch-check'],
      expect.objectContaining({ input: 'master\n' }),
    );
  });

  it('never caches a working-tree status query', async () => {
    resolveSpawn(' M a.ts\0');
    resolveSpawn('');
    await runWithReviewGitCache(async () => {
      await executeReviewGit(ROOT, ['status', '--porcelain', '-z']);
      await executeReviewGit(ROOT, ['status', '--porcelain', '-z']);
    });
    expect(spawnCli).toHaveBeenCalledTimes(2);
  });

  it('retries a failed query instead of caching the failure', async () => {
    resolveSpawn('', 128);
    resolveSpawn('recovered');
    await runWithReviewGitCache(async () => {
      await expect(
        executeReviewGit(ROOT, ['merge-base', 'main', 'HEAD']),
      ).rejects.toThrow(/exit 128/);
      await expect(
        executeReviewGit(ROOT, ['merge-base', 'main', 'HEAD']),
      ).resolves.toBe('recovered');
    });
    expect(spawnCli).toHaveBeenCalledTimes(2);
  });

  it('does not share results across action scopes', async () => {
    resolveSpawn('first');
    resolveSpawn('second');
    const first = await runWithReviewGitCache(() =>
      executeReviewGit(ROOT, ['branch', '--show-current']),
    );
    const second = await runWithReviewGitCache(() =>
      executeReviewGit(ROOT, ['branch', '--show-current']),
    );
    expect([first, second]).toEqual(['first', 'second']);
  });
});
