#!/usr/bin/env node
import { createLogger } from '../lib/logger.js';

import { startServer } from './server.js';

const log = createLogger('mcp');

startServer().catch((error) => {
  // Always stderr — fatal startup error must be visible regardless of FILID_DEBUG
  console.error('Failed to start MCP server:', error);
  log.error('Failed to start MCP server:', error);
  process.exit(1);
});
