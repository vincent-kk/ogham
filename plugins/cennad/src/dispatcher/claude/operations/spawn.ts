import { spawnCli } from '@ogham/cross-platform';

import { MAX_CLI_OUTPUT_CHARS } from '../../../constants/spawnLimits.js';
import { timeoutError } from '../../utils/timeoutError.js';

export interface ClaudeSpawnResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  spawnError: NodeJS.ErrnoException | null;
  abortedByCaller: boolean;
  cancelled: boolean;
}

export interface ClaudeSpawnOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  idleTimeoutMs?: number;
  /** Stops the run early — a cancelled MCP request or `stop_conversation`. */
  signal?: AbortSignal;
}

export async function spawnClaude(
  args: string[],
  options: ClaudeSpawnOptions = {},
): Promise<ClaudeSpawnResult> {
  const result = await spawnCli('claude', args, {
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    timeoutMs: options.timeoutMs,
    idleTimeoutMs: options.idleTimeoutMs,
    // Both limits are ceilings config chose — Windows must not move them.
    scaleWindowsTimeout: false,
    maxOutputChars: MAX_CLI_OUTPUT_CHARS,
    signal: options.signal,
    // The child Claude runs its own tools as subprocesses; leading a group is
    // what makes a kill reach them. POSIX only — Windows tree-kills already.
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
      abortedByCaller: false,
      cancelled: true,
    };
  if (result.timedOut) {
    const err = timeoutError({
      cli: 'claude',
      timeoutKind: result.timeoutKind,
      idleTimeoutMs: options.idleTimeoutMs,
      hardCapMs: options.timeoutMs,
    });
    return {
      exitCode: -1,
      stdout: result.stdout,
      stderr: result.stderr,
      spawnError: err,
      abortedByCaller: false,
      cancelled: false,
    };
  }
  if (result.abortedByCaller)
    return {
      exitCode: -1,
      stdout: result.stdout,
      stderr: result.stderr,
      spawnError: null,
      abortedByCaller: true,
      cancelled: false,
    };

  if (result.spawnError)
    return {
      exitCode: -1,
      stdout: result.stdout,
      stderr: result.stderr,
      spawnError: result.spawnError as NodeJS.ErrnoException,
      abortedByCaller: false,
      cancelled: false,
    };

  return {
    exitCode: result.code ?? 0,
    stdout: result.stdout,
    stderr: result.stderr,
    spawnError: null,
    abortedByCaller: false,
    cancelled: false,
  };
}
