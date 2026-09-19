import { devNull } from 'node:os';

import { spawnCliSync } from '@ogham/cross-platform';

/**
 * Identity, clock and configuration pinned so equal bytes always produce equal commit ids:
 * global and system git config (excludes, attributes, hooks) cannot reach the fixture.
 */
const PINNED_GIT_ENVIRONMENT = {
  GIT_AUTHOR_NAME: 'Filid Test',
  GIT_AUTHOR_EMAIL: 'filid@example.test',
  GIT_AUTHOR_DATE: '2026-01-01T00:00:00Z',
  GIT_COMMITTER_NAME: 'Filid Test',
  GIT_COMMITTER_EMAIL: 'filid@example.test',
  GIT_COMMITTER_DATE: '2026-01-01T00:00:00Z',
  GIT_CONFIG_GLOBAL: devNull,
  GIT_CONFIG_SYSTEM: devNull,
  GIT_CONFIG_NOSYSTEM: '1',
} as const;

/**
 * Execute Git with a pinned identity, clock and byte-preserving configuration.
 * @param projectRoot Absolute temporary repository root.
 * @param args Exact Git arguments.
 * @returns Standard output without trailing line endings.
 * @throws When Git exits unsuccessfully or cannot be spawned.
 */
export function runPinnedReviewGit(
  projectRoot: string,
  args: readonly string[],
): string {
  const result = spawnCliSync(
    'git',
    ['-c', 'commit.gpgsign=false', '-c', 'core.autocrlf=false', ...args],
    { cwd: projectRoot, env: { ...process.env, ...PINNED_GIT_ENVIRONMENT } },
  );
  if (result.code !== 0 || result.spawnError || result.timedOut)
    throw new Error(
      `git ${args.join(' ')} (code=${result.code}): ${result.stderr || result.stdout || result.spawnError?.message || 'no output'}`,
    );
  return result.stdout.trimEnd();
}
