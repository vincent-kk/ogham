import { spawnCli } from '@ogham/cross-platform';

import {
  REVIEW_STATE_GIT,
  REVIEW_STATE_GIT_TIMEOUT_MS,
} from '../../../../constants/reviewState.js';

export async function executeReviewGit(
  projectRoot: string,
  args: readonly string[],
): Promise<string> {
  const result = await spawnCli(REVIEW_STATE_GIT.BINARY, args, {
    cwd: projectRoot,
    timeoutMs: REVIEW_STATE_GIT_TIMEOUT_MS,
    normalizeEol: false,
  });

  if (result.spawnError)
    throw new Error(
      `${REVIEW_STATE_GIT.BINARY} ${args[0] ?? ''} failed in ${projectRoot}: ${result.spawnError.message}`,
      { cause: result.spawnError },
    );
  if (result.code !== 0)
    throw new Error(
      `${REVIEW_STATE_GIT.BINARY} ${args[0] ?? ''} failed in ${projectRoot} (exit ${result.code}): ${result.stderr.trim()}`,
    );

  return result.stdout;
}
