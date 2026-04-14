/**
 * @file server.ts
 * @description maencof MCP server — orchestrates 18 tool registrations.
 *
 * Tool list:
 * CRUD x5: `create`, `read`, `update`, `delete`, `move`
 * Insight x1: `capture_insight`
 * Search x5: kg_search, kg_navigate, kg_context, kg_status, kg_suggest_links
 * Build x1: kg_build
 * Boundary x1: boundary_create
 * CLAUDE.md x3: claudemd_merge, claudemd_read, claudemd_remove
 * Dailynote x1: dailynote_read
 * Cache x1: context_cache_manage
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { VERSION } from '../../version.js';

import { registerCrudTools } from './register-crud-tools.js';
import { registerKgTools } from './register-kg-tools.js';
import {
  registerCacheTools,
  registerClaudeMdTools,
  registerDailynoteTools,
} from './register-metadata-tools.js';

/**
 * Creates the maencof MCP server and registers 18 tools.
 */
export function createServer(): McpServer {
  const server = new McpServer({ name: 'maencof', version: VERSION });
  registerCrudTools(server);
  registerKgTools(server);
  registerClaudeMdTools(server);
  registerDailynoteTools(server);
  registerCacheTools(server);
  return server;
}

/**
 * Starts the MCP server with stdio transport.
 */
export async function startServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
