import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { loadConfig } from '../../../core/configManager/index.js';
import { migrateLegacyData } from '../../../core/dataHome/index.js';
import { pruneExpired } from '../../../core/sessionStore/index.js';
import { logger } from '../../../lib/logger.js';

import { createServer } from './createServer.js';

export async function startServer(): Promise<void> {
  const server = createServer();

  try {
    await migrateLegacyData();
    const config = await loadConfig();
    const removed = await pruneExpired(config.session_ttl_hours);
    if (removed > 0)
      logger.warn('pruned expired sessions on startup', { count: removed });
  } catch (err) {
    logger.warn('session prune failed on startup', {
      error: (err as Error).message,
    });
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
