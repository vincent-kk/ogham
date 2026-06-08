import { execa } from 'execa';

import type { Config } from '../../config/index.js';
import { BASE_ARGS } from '../../constants/ytdlp.js';
import { toYtDlpError } from '../../domain/to-ytdlp-error.js';
import type { Logger } from '../../obs/logger.js';
import type { BinaryManager } from '../binary/ensure-binary.js';

import { cookieArgs, proxyArg } from './evasion-args.js';
import { jsRuntimeArg } from './js-runtime-arg.js';

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
 * (ignore-config, no-warnings, node JS runtime, cookies), rotates the proxy per
 * call over `proxyPool`, runs via execa, and normalizes failures into typed
 * errors.
 */
export function createRunner(deps: RunnerDeps): Runner {
  const { binaryManager, config, logger } = deps;
  const nodePath = deps.nodePath ?? process.execPath;
  const commonArgs = [
    ...BASE_ARGS,
    ...jsRuntimeArg(nodePath),
    ...cookieArgs(config),
  ];

  const pool = config.evasion.proxyPool;
  let rrIndex = 0;
  const nextProxy = (): string | undefined => {
    if (pool.length > 0) {
      const proxy = pool[rrIndex % pool.length];
      rrIndex += 1;
      return proxy;
    }
    return config.evasion.proxy;
  };

  return {
    async run(args, opts): Promise<RunResult> {
      const bin = await binaryManager.ensureBinary(opts?.signal);
      const proxy = nextProxy();
      const finalArgs = [...commonArgs, ...proxyArg(proxy), ...args];
      logger.debug(
        { argc: finalArgs.length, rotated: pool.length > 0 },
        'yt-dlp invoke',
      );
      try {
        const result = await execa(bin, finalArgs, {
          timeout: opts?.timeoutMs ?? config.extraction.timeoutMs,
          cancelSignal: opts?.signal,
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
