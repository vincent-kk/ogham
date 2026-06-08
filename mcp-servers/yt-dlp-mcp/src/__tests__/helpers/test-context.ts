import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { type Config, loadConfig } from '../../config/index.js';
import { type Logger, createLogger } from '../../obs/logger.js';
import { type Paths, createPaths } from '../../paths/index.js';
import type { OpContext } from '../../ytdlp/operations/context.js';
import type { Runner } from '../../ytdlp/runner/runner.js';

export const silentLogger: Logger = createLogger('silent');

export interface TestEnv {
  config: Config;
  paths: Paths;
  home: string;
  cleanup: () => Promise<void>;
}

/** Creates a real Config + Paths rooted in a throwaway temp YTDLP_HOME. */
export async function makeTestEnv(
  env: Record<string, string | undefined> = {},
): Promise<TestEnv> {
  const home = await mkdtemp(path.join(tmpdir(), 'ytmcp-'));
  const config = loadConfig({ ...env, YTDLP_HOME: home });
  const paths = createPaths(config);
  await paths.ensureBaseDirs();
  return {
    config,
    paths,
    home,
    cleanup: () => rm(home, { recursive: true, force: true }),
  };
}

export async function makeOpContext(
  runner: Runner,
  env: Record<string, string | undefined> = {},
): Promise<{ ctx: OpContext; env: TestEnv }> {
  const testEnv = await makeTestEnv(env);
  const ctx: OpContext = {
    runner,
    config: testEnv.config,
    paths: testEnv.paths,
    logger: silentLogger,
  };
  return { ctx, env: testEnv };
}
