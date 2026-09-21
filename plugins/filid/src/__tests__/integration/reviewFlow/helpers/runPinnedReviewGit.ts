import {
  portableJoin,
  spawnCliSync,
  writeUtf8FileSync,
} from '@ogham/cross-platform';

import { createFixtureProjectRoot } from '../../helpers/createFixtureProjectRoot.js';
import { testRunRoot } from '../../helpers/testRunRoot.js';

let cachedPinnedGitConfigPath: string | undefined;

/**
 * An empty real git config file, created lazily and memoized once per process.
 *
 * `/dev/null` cannot stand in for it on Windows (`\\.\nul` is not a path Git
 * for Windows can open as a config file), so an empty file is written instead;
 * an empty file masks the user's real global config exactly as `/dev/null`
 * does on POSIX. It sits outside the fixture repository, under the run root
 * `vitest.globalSetup.ts` removes at the end of the run, and each mkdtemp call
 * is unique so parallel vitest workers cannot collide on it.
 * @returns Absolute path to the empty config file.
 */
function pinnedGitConfigPath(): string {
  if (!cachedPinnedGitConfigPath) {
    cachedPinnedGitConfigPath = portableJoin(
      createFixtureProjectRoot('filid-review-flow-gitconfig-', testRunRoot()),
      'config',
    );
    writeUtf8FileSync(cachedPinnedGitConfigPath, '');
  }
  return cachedPinnedGitConfigPath;
}

/**
 * Identity, clock and configuration pinned so equal bytes always produce equal commit ids:
 * global git config (excludes, attributes, hooks) cannot reach the fixture, and
 * `GIT_CONFIG_NOSYSTEM` keeps system config out regardless of where it points.
 */
const PINNED_GIT_ENVIRONMENT = {
  GIT_AUTHOR_NAME: 'Filid Test',
  GIT_AUTHOR_EMAIL: 'filid@example.test',
  GIT_AUTHOR_DATE: '2026-01-01T00:00:00Z',
  GIT_COMMITTER_NAME: 'Filid Test',
  GIT_COMMITTER_EMAIL: 'filid@example.test',
  GIT_COMMITTER_DATE: '2026-01-01T00:00:00Z',
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
    {
      cwd: projectRoot,
      env: {
        ...process.env,
        ...PINNED_GIT_ENVIRONMENT,
        GIT_CONFIG_GLOBAL: pinnedGitConfigPath(),
      },
    },
  );
  if (result.code !== 0 || result.spawnError || result.timedOut)
    throw new Error(
      `git ${args.join(' ')} (code=${result.code}): ${result.stderr || result.stdout || result.spawnError?.message || 'no output'}`,
    );
  return result.stdout.trimEnd();
}
