/**
 * @file server.ts
 * @description maencof MCP server — orchestrates all tool registrations.
 *
 * Tool list:
 * CRUD x5: `create`, `read`, `update`, `delete`, `move`
 * Insight x1: `capture_insight`
 * Search x5: kg_search, kg_navigate, kg_context, kg_status, kg_suggest_links
 * Build x1: kg_build
 * Boundary x1: boundary_create
 * CLAUDE.md x3: claudemd_merge, claudemd_read, claudemd_remove
 * Companion x1: companion_edit
 * Activity x1: activity_read
 * Work history x1: work_history
 * Cache x1: context_cache_manage
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { VERSION } from '../../version.js';

import { getVaultPath } from './graphCache/index.js';
import { bootSweep } from './lifecycle/bootSweep.js';
import { registerShutdown } from './lifecycle/registerShutdown.js';
import {
  triggerBootRebuildIfStale,
  walkVaultForExternalChanges,
} from './middlewares/index.js';
import {
  registerActivityReadTools,
  registerCacheTools,
  registerClaudeMdTools,
  registerCompanionTools,
  registerCrudTools,
  registerKgTools,
  registerPersonalContextTools,
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
  registerCompanionTools(server);
  registerPersonalContextTools(server);
  registerActivityReadTools(server);
  registerCacheTools(server);
  registerWorkHistoryTools(server);
  return server;
}

/**
 * Starts the MCP server with stdio transport.
 *
 * 종료 핸들러를 먼저 등록하고(자기 세션 즉시 마감 — best-effort), boot 직후
 * bootSweep(직전 세션 잔여 완결: turn-context 폐기 → 세션 sweep → prune →
 * changelog 스캔 → 아카이빙 → 자동 커밋) → walkVaultForExternalChanges(외부
 * 편집·sweep 이동 결과의 stale 등록) → stale 이 있으면 background 증분 빌드
 * 1회를 체인으로 detach 한다. 절대 await하지 않으며(부팅 비차단) 각 단계는
 * 부재 시 no-op이다.
 */
export async function startServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);

  try {
    const vaultPath = getVaultPath();
    registerShutdown(vaultPath);
    void bootSweep(vaultPath)
      .then(() => walkVaultForExternalChanges(vaultPath))
      .then(() => triggerBootRebuildIfStale(vaultPath))
      .catch(() => {
        /* fire-and-forget; failures are logged inside the concerns */
      });
  } catch {
    /* getVaultPath() may throw on blocked global config paths; silent */
  }
}
