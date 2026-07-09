/**
 * @file commitStaged.ts
 * @description staged 변경을 --no-verify 로 커밋한다.
 */
import { runGit } from '../runner/runGit.js';

export async function commitStaged(
  cwd: string,
  commitMessage: string,
): Promise<void> {
  const commit = await runGit(cwd, [
    'commit',
    '--no-verify',
    '-m',
    commitMessage,
  ]);
  if (commit.code !== 0 || commit.spawnError)
    throw new Error(
      `git commit failed: ${commit.stderr.trim() || commit.spawnError?.message || `exit ${commit.code}`}`,
    );
}
