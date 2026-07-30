import { spawnCli } from '@ogham/cross-platform';

import { MAX_CLI_OUTPUT_CHARS } from '../../../constants/spawnLimits.js';
import { createRetryStormDetector } from '../../utils/createRetryStormDetector.js';
import { timeoutError } from '../../utils/timeoutError.js';

export interface CodexSpawnResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  spawnError: NodeJS.ErrnoException | null;
  abortedByCaller: boolean;
  cancelled: boolean;
}

export interface CodexSpawnOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  idleTimeoutMs?: number;
  /** Stops the run early — a cancelled MCP request or `stop_conversation`. */
  signal?: AbortSignal;
}

export async function spawnCodex(
  args: string[],
  options: CodexSpawnOptions = {},
): Promise<CodexSpawnResult> {
  const result = await spawnCli('codex', args, {
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    timeoutMs: options.timeoutMs,
    idleTimeoutMs: options.idleTimeoutMs,
    // Both limits are ceilings config chose — Windows must not move them.
    scaleWindowsTimeout: false,
    maxOutputChars: MAX_CLI_OUTPUT_CHARS,
    onStderr: createRetryStormDetector(),
    signal: options.signal,
    // codex runs shells and tools of its own, and killing only the process it
    // leads leaves those behind. Leading a group is what makes the kill reach
    // them. POSIX only — Windows tree-kills through `taskkill /T` already.
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
      cli: 'codex',
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
