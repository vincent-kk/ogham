import { spawnCliSync } from '@ogham/cross-platform';

/**
 * Execute Git inside one temporary review-state repository.
 *
 * @param projectRoot - Absolute temporary Git repository root.
 * @param args - Exact Git arguments for the fixture operation.
 * @returns Standard output with only trailing line endings removed.
 * @throws When Git exits unsuccessfully or cannot be spawned.
 */
export function runReviewStateFixtureGit(
  projectRoot: string,
  args: readonly string[],
): string {
  const result = spawnCliSync('git', args, { cwd: projectRoot });
  if (result.code !== 0 || result.spawnError)
    throw new Error(result.stderr || result.spawnError?.message);
  return result.stdout.trimEnd();
}
