import { spawnCli } from '@ogham/cross-platform';

import type { GeminiSandboxBackend } from '../../../types/index.js';
import { createRetryStormDetector } from '../../utils/createRetryStormDetector.js';
import { resolveSandboxEnv } from '../utils/resolveSandboxEnv.js';

export interface GeminiSpawnResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  spawnError: NodeJS.ErrnoException | null;
  abortedByCaller: boolean;
}

export interface GeminiSpawnOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  sandbox?: boolean;
  sandboxBackend?: GeminiSandboxBackend;
  timeoutMs?: number;
}

export async function spawnGemini(
  args: string[],
  options: GeminiSpawnOptions = {},
): Promise<GeminiSpawnResult> {
  const sandboxEnv = resolveSandboxEnv({
    sandbox: options.sandbox,
    sandboxBackend: options.sandboxBackend,
  });
  const result = await spawnCli('gemini', args, {
    cwd: options.cwd,
    env: {
      ...process.env,
      GEMINI_CLI_TRUST_WORKSPACE: 'true',
      ...sandboxEnv,
      ...options.env,
    },
    timeoutMs: options.timeoutMs,
    onStderr: createRetryStormDetector(),
  });
  if (result.timedOut) {
    const err = new Error(
      `gemini spawn timed out after ${options.timeoutMs}ms`,
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
