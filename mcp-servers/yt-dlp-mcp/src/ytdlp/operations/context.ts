import type { Config } from '@/config/index.js';
import type { Logger } from '@/obs/logger.js';
import type { Paths } from '@/paths/index.js';

import type { Runner } from '../runner/runner.js';

/**
 * Everything an operation needs to talk to yt-dlp and the filesystem. Built by
 * the Service per call; operations are pure functions of this context + params,
 * which makes them testable with a fake Runner alone.
 */
export interface OpContext {
  runner: Runner;
  config: Config;
  paths: Paths;
  logger: Logger;
  signal?: AbortSignal;
}
