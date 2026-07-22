#!/usr/bin/env node
import { INJECTION_PREFIX } from '../../constants/plugin.js';
import { startServer } from '../server/startServer.js';

startServer().catch((error: unknown) => {
  console.error(`${INJECTION_PREFIX} MCP server failed to start:`, error);
  process.exit(1);
});
