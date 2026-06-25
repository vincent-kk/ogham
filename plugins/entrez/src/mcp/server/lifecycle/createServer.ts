import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { VERSION } from "../../../version.js";

/** MCP server identity — the plugin namespace presented to Claude Code. */
const SERVER_NAME = "entrez";

/**
 * Create and configure the entrez MCP server.
 *
 * Phase 0: an empty server (0 tools). Tool registrations are layered in from
 * Phase 5 (`paper_search`, `mesh_lookup`, `fetch_fulltext`, `setup`,
 * `auth-check`) without changing this lifecycle contract.
 */
export function createServer(): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: VERSION,
  });

  return server;
}
