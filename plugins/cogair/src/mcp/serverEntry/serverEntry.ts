#!/usr/bin/env node
import { startServer } from '../server/index.js';

startServer().catch((error) => {
  console.error('[cogair] Failed to start MCP server:', error);
  process.exit(1);
});
