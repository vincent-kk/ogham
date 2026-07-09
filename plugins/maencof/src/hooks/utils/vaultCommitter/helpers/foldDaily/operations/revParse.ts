/**
 * @file revParse.ts
 * @description Resolve a git ref to its commit hash; null when it does not exist.
 */
import { runGit } from '../../../../gitUtils/runner/runGit.js';

export async function revParse(
  cwd: string,
  ref: string,
): Promise<string | null> {
  const result = await runGit(cwd, ['rev-parse', '-q', '--verify', ref]);
  if (result.code !== 0 || result.spawnError) return null;
  const rev = result.stdout.trim();
  return rev.length > 0 ? rev : null;
}
