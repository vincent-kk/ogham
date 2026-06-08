import pLimit from 'p-limit';

import { TtlLruCache } from '../cache/cache.js';
import type { Config } from '../config/index.js';
import type { Logger } from '../obs/logger.js';
import type { Paths } from '../paths/index.js';
import { createThrottle } from '../utils/throttle.js';
import type { OpContext } from '../ytdlp/operations/context.js';
import type { Runner } from '../ytdlp/runner/runner.js';

export interface ServiceDeps {
  runner: Runner;
  config: Config;
  paths: Paths;
  logger: Logger;
  cacheTtlMs?: number;
  cacheMaxSize?: number;
}

export interface ExecuteOptions {
  cacheKey?: string;
  cacheable?: boolean;
  signal?: AbortSignal;
}

/**
 * Orchestration seam: cache lookup → concurrency-limited operation → cache store.
 * Operations are passed in as `fn`, so the Service is generic and unit-testable
 * with a fake `fn` (no yt-dlp needed).
 */
export interface Service {
  readonly config: Config;
  execute<T>(
    options: ExecuteOptions,
    fn: (ctx: OpContext) => Promise<T>,
  ): Promise<T>;
}

const SUBTITLE_PREFIXES = ['transcript:', 'subtitles:', 'list-subs:'] as const;

function isSubtitleCall(cacheKey: string): boolean {
  return SUBTITLE_PREFIXES.some((prefix) => cacheKey.startsWith(prefix));
}

export function createService(deps: ServiceDeps): Service {
  const limit = pLimit(deps.config.extraction.maxConcurrency);
  const lightThrottle = createThrottle(
    deps.config.extraction.requestIntervalMs,
  );
  const subtitleThrottle = createThrottle(
    deps.config.extraction.subtitleIntervalMs,
  );
  const cache = new TtlLruCache<unknown>(
    deps.cacheMaxSize ?? 200,
    deps.cacheTtlMs ?? 15 * 60_000,
  );

  return {
    config: deps.config,

    async execute<T>(
      options: ExecuteOptions,
      fn: (ctx: OpContext) => Promise<T>,
    ): Promise<T> {
      const { cacheKey, cacheable = false, signal } = options;
      if (cacheable && cacheKey) {
        const hit = cache.get(cacheKey);
        if (hit !== undefined) {
          deps.logger.debug({ cacheKey }, 'cache hit');
          return hit as T;
        }
      }
      const throttle =
        cacheKey && isSubtitleCall(cacheKey) ? subtitleThrottle : lightThrottle;
      await throttle.acquire();
      const ctx: OpContext = {
        runner: deps.runner,
        config: deps.config,
        paths: deps.paths,
        logger: deps.logger,
        signal,
      };
      const result = await limit(() => fn(ctx));
      if (cacheable && cacheKey) cache.set(cacheKey, result);
      return result;
    },
  };
}
