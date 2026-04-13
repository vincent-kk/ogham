/**
 * @file server.ts
 * @description atlassian MCP server — tool registration + routing
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { VERSION } from '../../version.js';

/**
 * Create and configure the MCP server with all tool registrations.
 * Tools will be registered in Phase 3.
 */
export function createServer(): McpServer {
  const server = new McpServer({
    name: 'atlassian',
    version: VERSION,
  });

  // Tool registrations will be added in Phase 3:
  // get, post, put, delete, convert, setup

  return server;
}

/**
 * Start the MCP server with stdio transport.
 */
export async function startServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
