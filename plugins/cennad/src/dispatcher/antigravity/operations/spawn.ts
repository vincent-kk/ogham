import { spawnCli } from '@ogham/cross-platform';

import { MAX_CLI_OUTPUT_CHARS } from '../../../constants/spawnLimits.js';
import { timeoutError } from '../../utils/timeoutError.js';

export interface AgySpawnResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  spawnError: NodeJS.ErrnoException | null;
  cancelled: boolean;
}

export interface AgySpawnOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  idleTimeoutMs?: number;
  /** Stops the run early — a cancelled MCP request or `stop_conversation`. */
  signal?: AbortSignal;
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
    signal: options.signal,
    // agy drives browsers and tools as its own children; leading a group is what
    // makes a kill reach them. POSIX only — Windows tree-kills already.
    detached: true,
  });
  // Ahead of every other verdict: a stop that lands while a limit is expiring
  // would otherwise be reported as the limit.
  if (options.signal?.aborted)
    return {
      exitCode: -1,
      stdout: result.stdout,
      stderr: result.stderr,
      spawnError: null,
      cancelled: true,
    };
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
      cancelled: false,
    };
  }
  if (result.spawnError)
    return {
      exitCode: -1,
      stdout: result.stdout,
      stderr: result.stderr,
      spawnError: result.spawnError as NodeJS.ErrnoException,
      cancelled: false,
    };

  return {
    exitCode: result.code ?? 0,
    stdout: result.stdout,
    stderr: result.stderr,
    spawnError: null,
    cancelled: false,
  };
}
