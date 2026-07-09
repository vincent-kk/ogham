/**
 * @file hasVaultChanges.ts
 * @description scope 내에 커밋되지 않은 변경이 있는지 판별한다.
 */
import { runGit } from '../runner/runGit.js';

export async function hasVaultChanges(
  cwd: string,
  scope: readonly string[],
): Promise<boolean> {
  const result = await runGit(cwd, ['status', '--porcelain', '--', ...scope]);
  if (result.code !== 0 || result.spawnError) return false;
  return result.stdout.trim().length > 0;
}
