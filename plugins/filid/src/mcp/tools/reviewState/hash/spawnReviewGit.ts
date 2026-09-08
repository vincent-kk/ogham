import { spawnCli } from '@ogham/cross-platform';

import {
  REVIEW_STATE_GIT,
  REVIEW_STATE_GIT_TIMEOUT_MS,
} from '../../../../constants/reviewState.js';

/**
 * Spawn one Git process inside a repository and return its standard output.
 *
 * @param projectRoot Absolute repository root the command runs in.
 * @param args Git arguments, passed verbatim without a shell.
 * @param input Text handed to Git on standard input; none when omitted.
 * @returns Raw standard output with line endings untouched.
 * @throws When Git cannot be spawned, times out, or exits non-zero; the
 *   message names the subcommand and root, and carries stderr.
 */
export async function spawnReviewGit(
  projectRoot: string,
  args: readonly string[],
  input?: string,
): Promise<string> {
  const result = await spawnCli(REVIEW_STATE_GIT.BINARY, args, {
    cwd: projectRoot,
    timeoutMs: REVIEW_STATE_GIT_TIMEOUT_MS,
    normalizeEol: false,
    ...(input === undefined ? {} : { input }),
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
