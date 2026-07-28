import { spawnCli } from '@ogham/cross-platform';

import { MAX_CLI_OUTPUT_CHARS } from '../../../constants/spawnLimits.js';
import { timeoutError } from '../../utils/timeoutError.js';

export interface ClaudeSpawnResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  spawnError: NodeJS.ErrnoException | null;
  abortedByCaller: boolean;
}

export interface ClaudeSpawnOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  idleTimeoutMs?: number;
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
  });
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
    };
  }
  if (result.abortedByCaller)
    return {
      exitCode: -1,
      stdout: result.stdout,
      stderr: result.stderr,
      spawnError: null,
      abortedByCaller: true,
    };

  if (result.spawnError)
    return {
      exitCode: -1,
      stdout: result.stdout,
      stderr: result.stderr,
      spawnError: result.spawnError as NodeJS.ErrnoException,
      abortedByCaller: false,
    };

  return {
    exitCode: result.code ?? 0,
    stdout: result.stdout,
    stderr: result.stderr,
    spawnError: null,
    abortedByCaller: false,
  };
}
