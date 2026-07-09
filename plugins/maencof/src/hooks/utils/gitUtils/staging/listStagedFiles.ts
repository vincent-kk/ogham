/**
 * @file listStagedFiles.ts
 * @description staged 파일 경로 목록을 반환한다.
 */
import { runGit } from '../runner/runGit.js';

export async function listStagedFiles(cwd: string): Promise<string[]> {
  const result = await runGit(cwd, ['diff', '--cached', '--name-only']);
  if (result.code !== 0 || result.spawnError) return [];
  return result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
