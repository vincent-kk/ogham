/**
 * @file detectWatchedChanges.ts
 * @description 감시 경로(WATCHED_PATHS)의 미기록 git 변경을 조회한다.
 */
import { spawnCli } from '@ogham/cross-platform/spawn';

import {
  CHANGELOG_EXCLUDE,
  WATCHED_PATHS,
} from '../../../../../constants/changelog.js';
import { EXEC_TIMEOUT_MS } from '../../../../../constants/performance.js';

import { parsePorcelainZ } from './parsePorcelainZ.js';

/** 감시 경로의 미기록 변경 조회. changelog 디렉터리 자체는 제외. */
export async function detectWatchedChanges(cwd: string): Promise<string[]> {
  const result = await spawnCli(
    'git',
    ['status', '--porcelain', '-z', '--', ...WATCHED_PATHS],
    { cwd, timeoutMs: EXEC_TIMEOUT_MS },
  );
  if (result.code !== 0 || result.spawnError) return [];
  return parsePorcelainZ(result.stdout)
    .filter((entry) => !entry.path.startsWith(CHANGELOG_EXCLUDE))
    .map((entry) => `${entry.status} ${entry.path}`);
}
