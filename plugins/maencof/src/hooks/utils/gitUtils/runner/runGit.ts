/**
 * @file runGit.ts
 * @description Run git, retrying with backoff while another process holds .git/index.lock.
 */
import type { SpawnResult } from '@ogham/cross-platform/spawn';
import { spawnCli } from '@ogham/cross-platform/spawn';

import {
  GIT_EXEC_TIMEOUT_MS,
  GIT_LOCK_RETRY_DELAYS_MS,
} from '../../../../constants/performance.js';

function isIndexLockFailure(result: SpawnResult): boolean {
  return result.code !== 0 && result.stderr.includes('index.lock');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runGit(
  cwd: string,
  args: readonly string[],
): Promise<SpawnResult> {
  let result = await spawnCli('git', [...args], {
    cwd,
    timeoutMs: GIT_EXEC_TIMEOUT_MS,
  });
  for (const delayMs of GIT_LOCK_RETRY_DELAYS_MS) {
    if (!isIndexLockFailure(result)) return result;
    await sleep(delayMs);
    result = await spawnCli('git', [...args], {
      cwd,
      timeoutMs: GIT_EXEC_TIMEOUT_MS,
    });
  }
  return result;
}
