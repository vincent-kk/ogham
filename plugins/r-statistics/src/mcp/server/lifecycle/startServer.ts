import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { WORKSPACE_TTL_HOURS } from "../../../constants/defaults.js";
import { pruneExpired } from "../../../core/index.js";
import { logger } from "../../../lib/logger.js";

import { createServer } from "./createServer.js";
import { registerShutdown } from "./registerShutdown.js";

/** Boot the MCP server over stdio after pruning expired workspaces. */
export async function startServer(): Promise<void> {
  const server = createServer();
  registerShutdown();

  try {
    const removed = await pruneExpired(WORKSPACE_TTL_HOURS);
    if (removed > 0) logger.info("pruned expired workspaces", { count: removed });
  } catch (error) {
    logger.warn("workspace prune failed on startup", {
      error: (error as Error).message,
    });
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
