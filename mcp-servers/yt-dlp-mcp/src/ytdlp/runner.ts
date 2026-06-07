import { execa } from 'execa';

import type { Config } from '../config.js';
import { BASE_ARGS, jsRuntimeArg } from '../constants/ytdlp.js';
import { toYtDlpError } from '../domain/to-ytdlp-error.js';
import type { Logger } from '../obs/logger.js';
import { evasionArgs } from './evasion-args.js';
import type { BinaryManager } from './ensure-binary.js';

export interface RunResult {
  stdout: string;
  stderr: string;
}

export interface RunOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
  cwd?: string;
}

/** Port: executes yt-dlp with the server's invariant flags already applied. */
export interface Runner {
  run(args: string[], opts?: RunOptions): Promise<RunResult>;
}

export interface RunnerDeps {
  binaryManager: BinaryManager;
  config: Config;
  logger: Logger;
  nodePath?: string;
}

/**
 * Real runner: resolves the binary (lazy, cached), prepends invariant flags
 * (ignore-config, no-warnings, node JS runtime, cookies/proxy), runs via execa,
 * and normalizes failures into typed errors.
 */
export function createRunner(deps: RunnerDeps): Runner {
  const { binaryManager, config, logger } = deps;
  const nodePath = deps.nodePath ?? process.execPath;
  const commonArgs = [...BASE_ARGS, ...jsRuntimeArg(nodePath), ...evasionArgs(config)];

  return {
    async run(args, opts): Promise<RunResult> {
      const bin = await binaryManager.ensureBinary(opts?.signal);
      const finalArgs = [...commonArgs, ...args];
      logger.debug({ argc: finalArgs.length }, 'yt-dlp invoke');
      try {
        const result = await execa(bin, finalArgs, {
          timeout: opts?.timeoutMs ?? config.extraction.timeoutMs,
          signal: opts?.signal,
          cwd: opts?.cwd,
          reject: true,
        });
        return { stdout: result.stdout, stderr: result.stderr };
      } catch (error) {
        throw toYtDlpError(error);
      }
    },
  };
}
