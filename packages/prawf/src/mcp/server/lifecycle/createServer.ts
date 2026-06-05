import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { VERSION } from '../../../version.js';

/**
 * Build the prawf MCP server.
 *
 * Skeleton stub: registers no tools yet. As capabilities are defined, add
 * `server.registerTool(...)` calls here (mirror the cogair package), wrapping
 * each handler so a thrown error never crashes the stdio transport.
 */
export function createServer(): McpServer {
  const server = new McpServer({ name: 'tools', version: VERSION });

  return server;
}
