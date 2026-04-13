/**
 * @file server-entry.ts
 * @description esbuild bundle entry point — starts MCP server in stdio mode.
 *
 * This file is bundled into bridge/mcp-server.cjs.
 * Invoked by Claude Code via `node bridge/mcp-server.cjs`.
 */
import { startServer } from '../server/server.js';

startServer().catch((err: unknown) => {
  process.stderr.write(`atlassian MCP server error: ${String(err)}\n`);
  process.exit(1);
});
