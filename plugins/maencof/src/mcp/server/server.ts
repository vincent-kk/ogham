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

import { getVaultPath } from './graphCache/index.js';
import { walkVaultForExternalChanges } from './middlewares/index.js';
import {
  registerCacheTools,
  registerClaudeMdTools,
  registerCrudTools,
  registerDailynoteTools,
  registerKgTools,
  registerWorkHistoryTools,
} from './registrations/index.js';

/**
 * Creates the maencof MCP server and registers all tools.
 */
export function createServer(): McpServer {
  const server = new McpServer({ name: 'maencof', version: VERSION });
  registerCrudTools(server);
  registerKgTools(server);
  registerClaudeMdTools(server);
  registerDailynoteTools(server);
  registerCacheTools(server);
  registerWorkHistoryTools(server);
  return server;
}

/**
 * Starts the MCP server with stdio transport.
 *
 * Boot 직후 walkVaultForExternalChanges를 detach하여 외부 편집(다른 프로세스가
 * vault 마크다운을 수정한 경우)의 stale 등록을 백그라운드에서 처리한다.
 * 이 walk은 절대 await하지 않으며 snapshot 부재 시 no-op이다.
 */
export async function startServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);

  try {
    walkVaultForExternalChanges(getVaultPath()).catch(() => {
      /* fire-and-forget; failures are logged inside vault-walk */
    });
  } catch {
    /* getVaultPath() may throw on blocked global config paths; silent */
  }
}
