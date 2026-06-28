import { spawnCli } from '@ogham/cross-platform';

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
}

export async function spawnClaude(
  args: string[],
  options: ClaudeSpawnOptions = {},
): Promise<ClaudeSpawnResult> {
  const result = await spawnCli('claude', args, {
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    timeoutMs: options.timeoutMs,
  });
  if (result.timedOut) {
    const err = new Error(
      `claude spawn timed out after ${options.timeoutMs}ms`,
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
