#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { loadConfig } from './config.js';
import { createService } from './core/service.js';
import { registerEnabledTools } from './mcp/registry.js';
import { createServer } from './mcp/server.js';
import { createLogger } from './obs/logger.js';
import { createPaths } from './paths.js';
import { SERVER_NAME, VERSION } from './version.js';
import { createBinaryManager } from './ytdlp/ensure-binary.js';
import { fetchJson } from './ytdlp/http.js';
import { createRunner } from './ytdlp/runner.js';
import { createVersionResolver } from './ytdlp/version.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(config.logLevel);
  const paths = createPaths(config);
  await paths.ensureBaseDirs();

  const versionResolver = createVersionResolver({
    config: { cooldownDays: config.binary.cooldownDays, pinnedVersion: config.binary.pinnedVersion },
    fetchJson,
  });
  const binaryManager = createBinaryManager({ paths, config, versionResolver, logger });
  const runner = createRunner({ binaryManager, config, logger });
  const service = createService({ runner, config, paths, logger });

  const server = createServer();
  registerEnabledTools(server, { service, config, logger });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info({ name: SERVER_NAME, version: VERSION }, 'yt-dlp-mcp started');

  const shutdown = (signal: string): void => {
    logger.info({ signal }, 'shutting down');
    void server.close().finally(() => process.exit(0));
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
  process.stderr.write(`fatal: ${message}\n`);
  process.exit(1);
});
