/**
 * @file getGitRoot.ts
 * @description git work tree 최상위 경로를 반환한다 (실패 시 null).
 */
import { runGit } from '../runner/runGit.js';

export async function getGitRoot(cwd: string): Promise<string | null> {
  const result = await runGit(cwd, ['rev-parse', '--show-toplevel']);
  if (result.code !== 0 || result.spawnError) return null;
  return result.stdout.trim();
}
