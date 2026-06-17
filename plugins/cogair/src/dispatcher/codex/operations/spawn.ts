import { spawnCli } from '@ogham/cross-platform';

import { createRetryStormDetector } from '../../utils/createRetryStormDetector.js';

export interface CodexSpawnResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  spawnError: NodeJS.ErrnoException | null;
  abortedByCaller: boolean;
}

export interface CodexSpawnOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
}

export async function spawnCodex(
  args: string[],
  options: CodexSpawnOptions = {},
): Promise<CodexSpawnResult> {
  const result = await spawnCli('codex', args, {
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    timeoutMs: options.timeoutMs,
    onStderr: createRetryStormDetector(),
  });
  if (result.timedOut) {
    const err = new Error(
      `codex spawn timed out after ${options.timeoutMs}ms`,
    ) as NodeJS.ErrnoException;
    err.code = 'ETIMEDOUT';
    return {
      exitCode: -1,
      stdout: result.stdout,
      stderr: result.stderr,
      spawnError: err,
      abortedByCaller: false,
    };
  }
  if (result.abortedByCaller) {
    return {
      exitCode: -1,
      stdout: result.stdout,
      stderr: result.stderr,
      spawnError: null,
      abortedByCaller: true,
    };
  }
  if (result.spawnError) {
    return {
      exitCode: -1,
      stdout: result.stdout,
      stderr: result.stderr,
      spawnError: result.spawnError as NodeJS.ErrnoException,
      abortedByCaller: false,
    };
  }
  return {
    exitCode: result.code ?? 0,
    stdout: result.stdout,
    stderr: result.stderr,
    spawnError: null,
    abortedByCaller: false,
  };
}
