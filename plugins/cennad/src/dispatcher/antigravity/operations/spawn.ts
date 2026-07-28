import { spawnCli } from '@ogham/cross-platform';

import { MAX_CLI_OUTPUT_CHARS } from '../../../constants/spawnLimits.js';
import { timeoutError } from '../../utils/timeoutError.js';

export interface AgySpawnResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  spawnError: NodeJS.ErrnoException | null;
}

export interface AgySpawnOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  idleTimeoutMs?: number;
}

export async function spawnAgy(
  args: string[],
  options: AgySpawnOptions = {},
): Promise<AgySpawnResult> {
  const result = await spawnCli('agy', args, {
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    timeoutMs: options.timeoutMs,
    idleTimeoutMs: options.idleTimeoutMs,
    // Both limits are ceilings config chose, and the cap also goes to agy as
    // --print-timeout: a Windows ×3 here would let the child's copy fire first.
    scaleWindowsTimeout: false,
    maxOutputChars: MAX_CLI_OUTPUT_CHARS,
  });
  if (result.timedOut) {
    const err = timeoutError({
      cli: 'agy',
      timeoutKind: result.timeoutKind,
      idleTimeoutMs: options.idleTimeoutMs,
      hardCapMs: options.timeoutMs,
    });
    return {
      exitCode: -1,
      stdout: result.stdout,
      stderr: result.stderr,
      spawnError: err,
    };
  }
  if (result.spawnError)
    return {
      exitCode: -1,
      stdout: result.stdout,
      stderr: result.stderr,
      spawnError: result.spawnError as NodeJS.ErrnoException,
    };

  return {
    exitCode: result.code ?? 0,
    stdout: result.stdout,
    stderr: result.stderr,
    spawnError: null,
  };
}
