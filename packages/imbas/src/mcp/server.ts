/**
 * @file server.ts
 * @description imbas MCP server — tool registration + routing
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { VERSION } from '../version.js';

import { handleImbasPing } from './tools/imbas-ping.js';

/**
 * Create and configure the MCP server with all tool registrations.
 */
export function createServer(): McpServer {
  const server = new McpServer({
    name: 'imbas',
    version: VERSION,
  });

  // --- Tool registrations ---

  server.tool(
    'imbas_ping',
    'Health check — returns server status and version',
    {},
    async () => handleImbasPing(),
  );

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
