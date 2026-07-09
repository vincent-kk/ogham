/**
 * @file isGitRepo.ts
 * @description cwd가 git work tree 내부인지 판별한다.
 */
import { runGit } from '../runner/runGit.js';

export async function isGitRepo(cwd: string): Promise<boolean> {
  const result = await runGit(cwd, ['rev-parse', '--is-inside-work-tree']);
  return result.code === 0 && !result.spawnError;
}
