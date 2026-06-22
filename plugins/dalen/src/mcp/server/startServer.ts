import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { loadConfig } from "../../core/configManager/loadConfig.js";
import { pruneExpired } from "../../core/sessionStore/pruneExpired.js";
import { logger } from "../../lib/logger.js";

import { createServer } from "./createServer.js";
import { registerShutdown } from "./registerShutdown.js";

/** Boot the MCP server over stdio after pruning expired sessions. */
export async function startServer(): Promise<void> {
  const server = createServer();
  registerShutdown();

  try {
    const config = await loadConfig();
    const removed = await pruneExpired(config.session_ttl_hours);
    if (removed > 0) logger.info("pruned expired sessions", { count: removed });
  } catch (err) {
    logger.warn("session prune failed on startup", {
      error: (err as Error).message,
    });
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
