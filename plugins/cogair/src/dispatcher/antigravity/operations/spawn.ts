import { spawnCli } from '@ogham/cross-platform';

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
}

export async function spawnAgy(
  args: string[],
  options: AgySpawnOptions = {},
): Promise<AgySpawnResult> {
  const result = await spawnCli('agy', args, {
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    timeoutMs: options.timeoutMs,
  });
  if (result.timedOut) {
    const err = new Error(
      `agy spawn timed out after ${options.timeoutMs}ms`,
    ) as NodeJS.ErrnoException;
    err.code = 'ETIMEDOUT';
    return {
      exitCode: -1,
      stdout: result.stdout,
      stderr: result.stderr,
      spawnError: err,
    };
  }
  if (result.spawnError) {
    return {
      exitCode: -1,
      stdout: result.stdout,
      stderr: result.stderr,
      spawnError: result.spawnError as NodeJS.ErrnoException,
    };
  }
  return {
    exitCode: result.code ?? 0,
    stdout: result.stdout,
    stderr: result.stderr,
    spawnError: null,
  };
}
